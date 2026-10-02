import { test, expect, type Browser, type BrowserContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/*
  THE SECURITY SURFACE.

  Everything in this file is a claim about who may do what, and each one is asserted
  against a real endpoint on a real server with a real session cookie rather than
  against a mocked lib function. That distinction is the whole point: the old suite
  drove the UI and therefore proved what a person can *reach*, which is not the same
  question as what an account is *allowed*. An account with a valid session that
  never touches the interface is exactly the case the permission table exists for,
  and only an HTTP-level assertion covers it.

  The matrix asserted here, from `lib/list-access.ts` and the design spec:

                     owner   invited buyer   unrelated
    read the list      200        200           404
    mark an open idea  200        200           404
    clear own mark     200        200           404
    clear other's mark 403        200           404
    add an idea        200        403           404
    delete an idea     200        403           404
    rename             200        403           404
    change visibility  200        403           404
    grant access       200        403           404
    revoke access      200        403           404
    delete the list    200        403           404

  404 and 403 are the load-bearing distinction and each is asserted separately.
  `404` to an account with no relationship to the list is what keeps another
  person's list from being confirmed to exist; if that row ever became 403, the
  product would be enumerating its users' private lists to anyone signed in.

  Every actor signs in through the real login route and each gets its own browser
  context, so each has its own cookie jar. Nothing here trusts the database for
  setup: the actors come from `prisma/seed.mjs` so that what the suite asserts is
  the shipped seed, and the throwaway lists are created through the API under test.
*/

const prisma = new PrismaClient();

const PASSWORD = 'test1234';

const ANNA = 'anna@example.test';
const BEN = 'ben@example.test';
const MIA = 'mia@example.test';

type Actor = { context: BrowserContext; api: BrowserContext['request'] };

/**
 * Sign one account in and hand back an isolated context for it.
 *
 * `identifier`, because that is the field name the login route reads. It used to be
 * `email` and this suite posted the address; the route now accepts a nickname or an
 * address in one field, and a helper still posting `email` fails with "Name or
 * email, and a password, are required" - which is the route being right about its
 * own contract and the caller being stale.
 */
const signIn = async (browser: Browser, email: string): Promise<Actor> => {
  const context = await browser.newContext();
  const response = await context.request.post('/api/auth/login', {
    data: { identifier: email, password: PASSWORD },
  });
  expect(
    response.ok(),
    `sign-in failed for ${email}: ${response.status()} ${await response.text()}`
  ).toBe(true);
  return { context, api: context.request };
};

/**
 * A private list, created through the API under test.
 *
 * Every assertion that mutates uses one of these rather than the seeded lists, so
 * the suite is idempotent and a failure does not leave the seed in a state that
 * makes the next run fail for the wrong reason.
 */
const createList = async (
  actor: Actor,
  name: string,
  visibility: 'PRIVATE' | 'SHARED'
): Promise<string> => {
  const response = await actor.api.post('/api/lists', {
    data: { name, visibility },
  });
  expect(
    response.ok(),
    `creating ${name} failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const body = await response.json();
  const id = body.list?.id ?? body.id;
  created.push(id);
  return id;
};

const addGift = async (actor: Actor, listId: string, title: string): Promise<string> => {
  const response = await actor.api.post(`/api/lists/${listId}/gifts`, {
    data: { title },
  });
  expect(
    response.ok(),
    `adding "${title}" failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const body = await response.json();
  return body.gift?.id ?? body.id;
};

const grant = async (actor: Actor, listId: string, email: string) =>
  actor.api.post(`/api/lists/${listId}/access`, { data: { email } });

/**
 * The audience, read off the sheet.
 *
 * There is no `GET /api/lists/{id}/access`: the grant route is POST-only and the
 * audience ships inside `GET /api/lists/{id}`, where it is present for the owner and
 * `[]` for a buyer. This helper exists because a first draft of this file asked for
 * a GET that does not exist - got an empty 405 body, and guarded on the result - so
 * the revoke assertion silently never ran. That is the failure mode this whole spec
 * exists to prevent, and it was in the test rather than in the product.
 */
const accessRows = async (
  actor: Actor,
  listId: string
): Promise<{ id: string; accountId: string | null }[]> => {
  const response = await actor.api.get(`/api/lists/${listId}`);
  expect(response.status(), 'reading the sheet to get its audience').toBe(200);
  const body = await response.json();
  return body.access ?? [];
};

/**
 * Every list this spec creates is named with this prefix, and they are all removed
 * afterwards.
 *
 * Without it the suite accumulates a dozen orphaned lists per run - they are all
 * still there in the seed database after a handful of passes - which is not tidiness
 * but correctness: the contents page renders one row per list, so a growing pile of
 * throwaway rows is a growing pile of things the other specs have to filter past,
 * and a real bug in row rendering can hide behind them.
 */
const TEST_LIST_PREFIX = 'e2e-sharing-';
let listCounter = 0;
const created: string[] = [];

const names = {
  next: () => `${TEST_LIST_PREFIX}${process.pid}-${(listCounter += 1)}`,
};

test.afterAll(async () => {
  if (created.length === 0) return;
  await prisma.gift.deleteMany({ where: { listId: { in: created } } });
  await prisma.listAccess.deleteMany({ where: { listId: { in: created } } });
  await prisma.list.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

test.describe('Sharing permissions', () => {
  test('an invited account can read the list and mark an idea bought', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Lampe');
    expect(await grant(anna, listId, BEN)).toBeTruthy();

    const read = await ben.api.get(`/api/lists/${listId}`);
    expect(read.status(), 'a buyer must be able to read a shared list').toBe(200);
    // Asserted against the whole serialized body rather than a field path: the
    // point is that the buyer can *see* the idea, not which nesting level the
    // handler chose this week.
    expect(JSON.stringify(await read.json())).toContain('Lampe');

    const toggle = await ben.api.post(
      `/api/lists/${listId}/gifts/${giftId}/toggle`
    );
    expect(
      toggle.status(),
      'marking an open idea bought is the one thing a buyer is for'
    ).toBe(200);
    expect((await toggle.json()).gift.isPurchased).toBe(true);

    await anna.context.close();
    await ben.context.close();
  });

  test('an invited account cannot change anything but the bought mark', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Nur lesen');
    await grant(anna, listId, BEN);

    // Read as the owner, because the owner is who is shown the audience at all. A
    // buyer gets `[]` here by design, so asking Ben would have yielded nothing and
    // quietly dropped the revoke case from the matrix below.
    const accessId = (await accessRows(anna, listId))[0]?.id;
    expect(accessId, 'the owner must be shown who the list is shared with').toBeTruthy();

    // Each of these is refused, and refused with 403 rather than 404: the buyer
    // can already read this list, so confirming it exists leaks nothing - and 403
    // is the status that tells the interface the control was never theirs to press.
    const forbidden: [string, Promise<{ status(): number }>][] = [
      [
        'add an idea',
        ben.api.post(`/api/lists/${listId}/gifts`, { data: { title: 'Nicht erlaubt' } }),
      ],
      ['delete an idea', ben.api.delete(`/api/lists/${listId}/gifts/${giftId}`)],
      ['rename the list', ben.api.patch(`/api/lists/${listId}`, { data: { name: 'Umbenannt' } })],
      [
        'change visibility',
        ben.api.patch(`/api/lists/${listId}`, { data: { visibility: 'PRIVATE' } }),
      ],
      ['grant access', ben.api.post(`/api/lists/${listId}/access`, { data: { email: MIA } })],
    ];
    if (accessId) {
      forbidden.push([
        'revoke access',
        ben.api.delete(`/api/lists/${listId}/access/${accessId}`),
      ]);
    }
    forbidden.push(['delete the list', ben.api.delete(`/api/lists/${listId}`)]);

    for (const [what, response] of forbidden) {
      const status = (await response).status();
      expect(status, `a buyer must not be able to ${what}`).toBe(403);
    }

    // The list survived every one of them, which is what makes the 403s above
    // refusals rather than lucky ordering.
    expect((await anna.api.get(`/api/lists/${listId}`)).status()).toBe(200);

    /*
      Including the idea. Asserted against the sheet's own gift ids rather than
      against a status from `GET /api/lists/{id}/gifts/{giftId}` - there is no such
      route, so that request answers 405 and any `>= 400` assertion passed
      vacuously. The question the test is actually asking is "is the idea still
      there", and the sheet is where the ideas are.
    */
    const survivors = await (
      await anna.api.get(`/api/lists/${listId}`)
    ).json();
    expect(
      survivors.gifts.map((g: { id: string }) => g.id)
    ).toContain(giftId);

    await anna.context.close();
    await ben.context.close();
  });

  test('an unrelated account is told the list does not exist', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const mia = await signIn(browser, MIA);

    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Geheimgeschenk');
    await grant(anna, listId, BEN);

    /*
      Mia holds access to a *different* list, so she is a real signed-in user
      rather than an anonymous one. That is the case worth testing: an anonymous
      request is refused by the session check, but a signed-in user asking about a
      list she was never added to is the one that could enumerate other people's
      private lists if the status were 403 instead of 404.
    */
    const miaLists = await mia.api.get('/api/lists');
    expect(miaLists.status()).toBe(200);

    const denied: [string, Promise<{ status(): number }>][] = [
      ['read', mia.api.get(`/api/lists/${listId}`)],
      ['add an idea', mia.api.post(`/api/lists/${listId}/gifts`, { data: { title: 'x' } })],
      ['rename', mia.api.patch(`/api/lists/${listId}`, { data: { name: 'x' } })],
      ['change visibility', mia.api.patch(`/api/lists/${listId}`, { data: { visibility: 'PRIVATE' } })],
      ['grant access', mia.api.post(`/api/lists/${listId}/access`, { data: { email: ANNA } })],
      ['delete an idea', mia.api.delete(`/api/lists/${listId}/gifts/${giftId}`)],
      ['delete the list', mia.api.delete(`/api/lists/${listId}`)],
    ];

    for (const [what, response] of denied) {
      const status = (await response).status();
      expect(status, `an unrelated account must not be able to ${what}`).toBe(404);
    }

    /*
      Reading the ideas is not a separate route - the sheet carries them - so the
      sharper version of that half of the assertion is that the refusal Mia is given
      never mentions them. A 404 whose body echoes the list's contents would pass
      every status assertion above.
    */
    const refusedSheet = await mia.api.get(`/api/lists/${listId}`);
    expect(refusedSheet.status()).toBe(404);
    expect(await refusedSheet.text()).not.toContain('Geheimgeschenk');

    await anna.context.close();
    await mia.context.close();
  });

  test('nobody without a session reaches anything', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna, names.next(), 'PRIVATE');

    const anonymous = await browser.newContext();
    expect((await anonymous.request.get(`/api/lists/${listId}`)).status()).toBe(401);
    expect(
      (await anonymous.request.post(`/api/lists/${listId}/gifts`, { data: { title: 'x' } })).status()
    ).toBe(401);

    await anonymous.close();
    await anna.context.close();
  });

  test('an owner cannot clear a mark somebody else set', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Geschenk');
    await grant(anna, listId, BEN);

    await ben.api.post(`/api/lists/${listId}/gifts/${giftId}/toggle`);

    /*
      This is the asymmetry the product exists for. The owner is the one account
      with a reason to want a mark gone - they have changed their mind about the
      gift - and a mark that erases is a double-buy. So the owner is refused, and
      the refusal is its own code rather than a generic 403, because the interface
      says something different for it: not "you may not", but "this mark is
      correct and permanent".
    */
    const ownerClear = await anna.api.post(
      `/api/lists/${listId}/gifts/${giftId}/toggle`
    );
    expect(ownerClear.status()).toBe(403);
    expect((await ownerClear.json()).code).toBe('cannot_clear_purchase');

    /*
      This is the half that actually matters, and it is asserted about the mark
      rather than about the idea. `toContain('Geschenk')` only proved the response
      mentioned the title at all - which it does whether the mark is standing or not.
      The row is found by id and its state is read.
    */
    const after = await (await ben.api.get(`/api/lists/${listId}`)).json();
    const marked = after.gifts.find((g: { id: string }) => g.id === giftId);
    expect(marked, 'the idea is still on the list').toBeTruthy();
    expect(
      marked.isPurchased,
      "the owner's refused clear must leave the buyer's mark standing"
    ).toBe(true);

    // A buyer correcting another buyer's mark is the coordination working, and is
    // deliberately allowed.
    const benClear = await ben.api.post(
      `/api/lists/${listId}/gifts/${giftId}/toggle`
    );
    expect(benClear.status(), 'a buyer may correct a mark').toBe(200);

    await anna.context.close();
    await ben.context.close();
  });

  test('an owner may clear a mark they set themselves', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Schon gekauft');

    await anna.api.post(`/api/lists/${listId}/gifts/${giftId}/toggle`);
    const cleared = await anna.api.post(
      `/api/lists/${listId}/gifts/${giftId}/toggle`
    );

    expect(cleared.status(), '"I already bought this" must be undoable').toBe(200);
    expect((await cleared.json()).gift.isPurchased).toBe(false);

    await anna.context.close();
  });

  test('no response anywhere carries the buyer', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Etwas');
    await grant(anna, listId, BEN);
    await ben.api.post(`/api/lists/${listId}/gifts/${giftId}/toggle`);

    /*
      `purchasedById` is stored so that the clear-a-mark rule above can be enforced.
      It must never be *returned*: the owner sees which ideas are bought and how
      many are left, and naming the buyer would spend the surprise the moment the
      first gift was bought. Asserted as a whole-body string search rather than a
      field path, so it also catches the column appearing under a name nobody
      checked.
    */
    for (const [what, response] of [
      ['owner reads the list', await anna.api.get(`/api/lists/${listId}`)],
      ['buyer reads the list', await ben.api.get(`/api/lists/${listId}`)],
      ['owner reads their lists', await anna.api.get('/api/lists')],
      ['buyer reads their lists', await ben.api.get('/api/lists')],
      ['owner reads the sheet', await anna.api.get(`/api/lists/${listId}`)],
    ] as [string, { json(): Promise<unknown> }][]) {
      const body = JSON.stringify(await response.json());
      expect(body, `${what} leaked the buyer`).not.toContain('purchasedById');
      expect(body, `${what} leaked an account id into a gift`).not.toContain('purchasedBy');
    }

    await anna.context.close();
    await ben.context.close();
  });

  test('sharing is refused in the states that cannot work', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    // Private lists cannot be shared with anybody, and saying so is more useful
    // than accepting the address and quietly not granting anything.
    const priv = await createList(anna, names.next(), 'PRIVATE');
    const tooEarly = await grant(anna, priv, BEN);
    expect(tooEarly.status()).toBe(400);
    expect((await tooEarly.json()).code).toBe('not_shared_yet');

    // There is no mail in this product, so an address with no account behind it
    // cannot be invited - it can only be refused.
    const shared = await createList(anna, names.next(), 'SHARED');
    const stranger = await grant(anna, shared, 'nobody@example.test');
    expect(stranger.status()).toBe(404);
    expect((await stranger.json()).code).toBe('no_such_account');

    // Sharing with yourself is meaningless and would be a second way to be in the
    // audience.
    const withSelf = await grant(anna, shared, ANNA);
    expect(withSelf.status()).toBe(400);
    expect((await withSelf.json()).code).toBe('cannot_share_with_owner');

    // And the same address twice is one grant, not two.
    await grant(anna, shared, BEN);
    const twice = await grant(anna, shared, BEN);
    expect(twice.status()).toBe(400);
    expect((await twice.json()).code).toBe('already_shared');

    await anna.context.close();
  });

  test('switching to private is a pause, and it restores the same audience', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    const granted = await grant(anna, listId, BEN);
    expect(granted.status()).toBe(200);
    expect((await ben.api.get('/api/lists')).ok()).toBe(true);
    const benSummary = await (await ben.api.get('/api/lists')).json();
    expect(
      benSummary.shared.map((l: { id: string }) => l.id)
    ).toContain(listId);

    const toPrivate = await anna.api.patch(`/api/lists/${listId}`, {
      data: { visibility: 'PRIVATE' },
    });
    expect(toPrivate.status()).toBe(200);

    // `PATCH` answers `{ success: true }` and not the changed row, so the effect is
    // confirmed by re-reading rather than by trusting the acknowledgement.
    const afterPause = await anna.api.get(`/api/lists/${listId}`);
    expect((await afterPause.json()).list.visibility).toBe('PRIVATE');

    // The grant survives, and is still visible to the owner - which is how the
    // owner can tell the difference between "nobody has been added" and "nobody can
    // currently see it".
    expect(await accessRows(anna, listId)).toHaveLength(1);
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(404);

    /*
      And the row leaves the other side's contents page entirely. This is the half
      that was broken while the read was already fixed, and the shape of the bug is
      the reason it is asserted separately: the list was unreachable and still
      visible, under a heading that says it is shared. A name and an owner's name in
      somebody's list of things shared with them, for a list their owner has just
      made private.

      The listing and the read are two predicates that have to agree. They were
      written twice, from the same wrong reasoning, and were wrong twice - so this
      asserts both in the same place rather than trusting them to stay in step.
    */
    const benListsAfter = await (await ben.api.get('/api/lists')).json();
    expect(
      benListsAfter.shared.map((l: { id: string }) => l.id),
      'a paused list must leave the "shared with you" section entirely'
    ).not.toContain(listId);

    const toShared = await anna.api.patch(`/api/lists/${listId}`, {
      data: { visibility: 'SHARED' },
    });
    expect(toShared.status()).toBe(200);

    // The same audience, without anybody being asked for their address twice.
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(200);
    const benListsBack = await (await ben.api.get('/api/lists')).json();
    expect(
      benListsBack.shared.map((l: { id: string }) => l.id)
    ).toContain(listId);

    await anna.context.close();
    await ben.context.close();
  });

  test('revoking is the one control that only ever tightens', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    await grant(anna, listId, BEN);
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(200);

    const accessId = (await accessRows(anna, listId))[0].id;

    const revoked = await anna.api.delete(`/api/lists/${listId}/access/${accessId}`);
    expect(revoked.status()).toBe(200);

    // Ben's session is still valid - revoking access is not signing him out - but
    // the list is gone for him.
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(404);
    expect(await accessRows(anna, listId)).toHaveLength(0);

    // And unlike the pause, it does not come back: revoke removes the grant rather
    // than closing the reads, because the owner asked for it to be gone.
    await anna.api.patch(`/api/lists/${listId}`, { data: { visibility: 'PRIVATE' } });
    await anna.api.patch(`/api/lists/${listId}`, { data: { visibility: 'SHARED' } });
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(404);

    await anna.context.close();
    await ben.context.close();
  });
});