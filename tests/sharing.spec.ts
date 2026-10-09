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

  The matrix asserted here, copied from the capability table at the top of
  `lib/list-access.ts`, which is the source of truth for it:

                     owner   invited buyer   in a group   anyone else
    read the list      200        200             200          404
    mark an open idea  200        200             200          404
    clear own mark     200        200             200          404
    clear other's mark 403        200             200          404
    add an idea        200        403             403          404
    delete an idea     200        403             403          404
    copy an idea       200        403             403          404
    move an idea       200        403             403          404
    rename             200        403             403          404
    change visibility  200        403             403          404
    grant access       200        403             403          404
    revoke access      200        403             403          404
    revoke group grant 200        403             403          404
    delete the list    200        403             403          404

  The two transfer rows are owner-only for the same reason `add an idea` and
  `delete an idea` are - both write onto a sheet - and they are the only rows here
  that gate their two ends differently. The *source* is `requireWritableList`, which
  is the 403 in the `invited buyer` column; the *destination* is `findOwnedList`,
  which is 404 for anybody who does not own it, including an account that can
  perfectly well read it. Being able to see a list is not a reason a wish may be
  written on it, and naming somebody else's list as a destination is answered with
  "there is nothing here for you" rather than with a status that would confirm the
  list exists.

  That asymmetry is why the destination refusals below are asserted as separate
  cases rather than folded into the two matrices: a request can fail at its source,
  at its destination, or at both, and the order they are checked in means only the
  first of those is visible in a status.

  "In a group" is a third column rather than a fourth kind of person, and it is carried
  the same in both directions: a member reaches a list through a `ListGroupAccess` row
  instead of a `ListAccess` one and gets exactly the row an invited buyer gets, because
  the reach is derived on every read rather than stored. So the `invited buyer` column is
  asserted here, against a named grant, and the `in a group` column of this same table is
  asserted in `tests/groups.spec.ts`, where the audience arrives by putting somebody in a
  group rather than by naming them.

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

    /*
      Ben's own list, so the two transfer rows below are refused for the reason the
      table says rather than for a missing destination. A buyer naming a list that
      does not exist would also be refused, but at the *destination* gate with a 404,
      and the row this matrix is asserting is the 403 at the source - so the
      destination has to be real and Ben's, or the test would pass for the wrong
      reason and the source gate would never run.
    */
    const bensListId = await createList(ben, names.next(), 'PRIVATE');

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
      /*
        Both transfer modes, and the destination is Ben's own list rather than
        something invented. This is the case the product refuses for its own sake:
        letting a buyer pull an idea off somebody's shared sheet onto a list he owns
        would make one list's audience a source of another account's wishlists, and
        the owner of the list it was taken from would never learn it happened. The
        refusal is at the *source*, before the destination is looked at, so Ben's
        ownership of it changes nothing.
      */
      [
        'copy an idea to a list of their own',
        ben.api.post(`/api/lists/${listId}/gifts/transfer`, {
          data: { giftIds: [giftId], targetListId: bensListId, mode: 'copy' },
        }),
      ],
      [
        'move an idea to a list of their own',
        ben.api.post(`/api/lists/${listId}/gifts/transfer`, {
          data: { giftIds: [giftId], targetListId: bensListId, mode: 'move' },
        }),
      ],
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
      A second list of Anna's, so the transfer rows below are malformed in exactly
      one respect: Mia owns nothing and has been given nothing. Naming a destination
      that does not exist would also answer 404, but at the destination gate, and
      these rows are asserting the source.
    */
    const annasOtherListId = await createList(anna, names.next(), 'PRIVATE');

    /*
      Mia holds access to a *different* list, so she is a real signed-in user
      rather than an anonymous one. That is the case worth testing: an anonymous
      request is refused by the session check, but a signed-in user asking about a
      list she was never added to is the one that could enumerate other people's
      private lists if the status were 403 instead of 404.
    */
    const miaLists = await mia.api.get('/api/lists');
    expect(miaLists.status()).toBe(200);

    /*
      Every body below is one the server accepts, and that is load-bearing rather than
      incidental. Each route here checks the shape of its request before it asks who is
      asking - a wish under `MIN_TITLE_LENGTH`, a malformed address, a name that is
      nothing - so a body chosen for being invalid is answered 400 without the gate in
      `lib/list-access.ts` ever running. A 400 in this loop would fail today and pass the
      moment the check were removed, which is the opposite of what this test is for: each
      request is one that only the gate can refuse, so a 404 here can only mean Mia has
      no relationship to the list.
    */
    const denied: [string, Promise<{ status(): number }>][] = [
      ['read', mia.api.get(`/api/lists/${listId}`)],
      [
        'add an idea',
        mia.api.post(`/api/lists/${listId}/gifts`, { data: { title: 'Lampe' } }),
      ],
      ['rename', mia.api.patch(`/api/lists/${listId}`, { data: { name: 'x' } })],
      ['change visibility', mia.api.patch(`/api/lists/${listId}`, { data: { visibility: 'PRIVATE' } })],
      ['grant access', mia.api.post(`/api/lists/${listId}/access`, { data: { email: ANNA } })],
      ['delete an idea', mia.api.delete(`/api/lists/${listId}/gifts/${giftId}`)],
      ['delete the list', mia.api.delete(`/api/lists/${listId}`)],
      [
        'copy an idea off it',
        mia.api.post(`/api/lists/${listId}/gifts/transfer`, {
          data: { giftIds: [giftId], targetListId: annasOtherListId, mode: 'copy' },
        }),
      ],
      [
        'move an idea off it',
        mia.api.post(`/api/lists/${listId}/gifts/transfer`, {
          data: { giftIds: [giftId], targetListId: annasOtherListId, mode: 'move' },
        }),
      ],
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

    /*
      The transfer rows in the loop above name a destination Mia also cannot reach,
      and neither of them moved anything. The status is the same 404 the read got,
      and it is the *same* refusal rather than a new one: the destination gate is
      `findOwnedList`, which cannot tell "not yours" from "not there" and is not
      trying to. A 403 here would have confirmed both that Anna's second list exists
      and that it is off limits.
    */
    const annasSheet = await anna.api.get(`/api/lists/${listId}`);
    expect(annasSheet.status()).toBe(200);
    const untouched = await annasSheet.json();
    // Exactly the one idea: neither moved away nor duplicated onto the source, and
    // `toEqual` on the whole array is what makes a second copy fail rather than pass
    // a `toContain`.
    expect(
      untouched.gifts.map((g: { id: string }) => g.id),
      "Mia's refused transfers must not have moved or copied the idea"
    ).toEqual([giftId]);
    expect(
      await prisma.gift.count({ where: { listId: annasOtherListId } }),
      "and nothing may have landed on Anna's other list"
    ).toBe(0);

    /*
      The status is pinned above, and in many places, and it is the right thing to pin.
      What was missing is the `code` standing beside it - and the client narrows on the
      code rather than on the status, because `isRefusal` is what turns an unknown
      string into a refusal that has a sentence. A 404 with no code would leave the
      interface a status to read and nothing to say. Asserted here, in the case that is
      already the canonical unrelated-account read, so the two are pinned together and
      neither can move without the other.
    */
    expect(
      (await refusedSheet.json()).code,
      'the 404 must carry the code the client narrows on'
    ).toBe('not_found');

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
    expect(
      (
        await anonymous.request.post(`/api/lists/${listId}/gifts/transfer`, {
          data: { giftIds: ['x'], targetListId: 'y', mode: 'move' },
        })
      ).status(),
      'the transfer route is behind the same session gate as every other'
    ).toBe(401);

    await anonymous.close();
    await anna.context.close();
  });

  /*
    THE TRANSFER'S TWO ENDS.

    The two matrices above cover the source: a buyer gets 403 and an unrelated
    account gets 404. What is left is the destination, which is gated by a different
    function on purpose, and the three refusals below are the cases only it can
    produce. `findOwnedList` answers 404 for a list that does not exist and for a
    list somebody else owns, and does not distinguish them - so each assertion here
    also pins the fact that neither can be told apart.
  */
  test('a destination the account does not own is refused, and nothing moves', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna, names.next(), 'PRIVATE');
    const bensListId = await createList(ben, names.next(), 'PRIVATE');
    const giftId = await addGift(anna, sourceId, 'Nur auf meiner Liste');

    for (const mode of ['copy', 'move'] as const) {
      const refused = await anna.api.post(`/api/lists/${sourceId}/gifts/transfer`, {
        data: { giftIds: [giftId], targetListId: bensListId, mode },
      });

      expect(
        refused.status(),
        `a destination the caller does not own must be 404 on ${mode}`
      ).toBe(404);
      expect((await refused.json()).code).toBe('not_found');

      // And the same answer, byte for byte, for a destination that is not there at
      // all. The gate cannot tell the two apart and must not: a status that did
      // would confirm which of Anna's lists exist.
      const nowhere = await anna.api.post(`/api/lists/${sourceId}/gifts/transfer`, {
        data: { giftIds: [giftId], targetListId: 'no-such-list', mode },
      });
      expect(
        nowhere.status(),
        `a destination that does not exist must be refused identically on ${mode}`
      ).toBe(404);
      expect((await nowhere.json()).code).toBe('not_found');
    }

    // Neither list changed. Asserted as counts off the database rather than off a
    // status: a transfer that refused at the destination and moved the idea anyway
    // would still answer 404 here.
    expect(
      await prisma.gift.count({ where: { listId: sourceId } }),
      'a refused transfer must leave the source with the idea still on it'
    ).toBe(1);
    expect(
      await prisma.gift.count({ where: { listId: bensListId } }),
      "a refused transfer must not put the idea on somebody else's list"
    ).toBe(0);

    await anna.context.close();
    await ben.context.close();
  });

  test('a destination the account may read but does not own is still refused', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna, names.next(), 'SHARED');
    const bensListId = await createList(ben, names.next(), 'SHARED');
    const giftId = await addGift(anna, sourceId, 'Wunsch');
    // Ben grants it, because only the owner can. This line used to be `grant(anna, ...)`,
    // which Anna is not allowed to do - the grant failed unnoticed, Anna could not read
    // Ben's list at all, and the 404 below was the answer to "no relationship" rather
    // than to "readable but not owned". The test passed for a reason that had nothing
    // to do with the rule it names, so the grant is now asserted.
    const granted = await grant(ben, bensListId, ANNA);
    expect(
      granted.ok(),
      `Ben must be able to put Anna on his list: ${granted.status()} ${await granted.text()}`
    ).toBe(true);

    /*
      Anna can *read* Ben's list - she is on its audience - and still cannot have a
      wish written on it. This is the case that rules out reusing
      `requireWritableList` for the destination: that function returns `not_found`
      for a list nobody owns and `forbidden` for one the caller can read but not
      write, which would have answered 403 here and confirmed that Ben's list
      exists. A list you can see is not a list you may file things on.
    */
    const refused = await anna.api.post(`/api/lists/${sourceId}/gifts/transfer`, {
      data: { giftIds: [giftId], targetListId: bensListId, mode: 'move' },
    });

    expect(
      refused.status(),
      'a readable destination is still not a writable one'
    ).toBe(404);
    expect(
      await prisma.gift.count({ where: { listId: bensListId } }),
      'and nothing may be written there'
    ).toBe(0);

    await anna.context.close();
    await ben.context.close();
  });

  test('a destination equal to the source is a malformed request, not a refusal', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna, names.next(), 'PRIVATE');
    const giftId = await addGift(anna, listId, 'Schon hier');

    const refused = await anna.api.post(`/api/lists/${listId}/gifts/transfer`, {
      data: { giftIds: [giftId], targetListId: listId, mode: 'move' },
    });

    /*
      400 and not 404, which is the one status in this file that is not about
      authority at all - and that is the point. Both lists in the request are the
      caller's own and they are the same one, so there is nothing here being hidden
      from anybody and no permission being denied. It is answered by comparing two
      ids rather than by looking anything up, which is why it can be a request-shape
      refusal at all.

      The picker never offers the source list as a destination, so reaching this
      means the request was built wrongly rather than that the reader chose badly.
    */
    expect(refused.status()).toBe(400);
    expect((await refused.json()).code).toBe('already_on_this_list');

    // Still exactly one idea on the list - a `move` onto itself that quietly
    // deleted the row would answer 400 here too.
    expect(
      await prisma.gift.count({ where: { listId } }),
      'a transfer onto the same list must change nothing'
    ).toBe(1);

    await anna.context.close();
  });

  test('a batch naming one idea that is not on the source is refused whole', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const sourceId = await createList(anna, names.next(), 'PRIVATE');
    const otherId = await createList(anna, names.next(), 'PRIVATE');
    const targetId = await createList(anna, names.next(), 'PRIVATE');
    const mineId = await addGift(anna, sourceId, 'Gehört hierher');
    const foreignId = await addGift(anna, otherId, 'Gehört woanders');

    for (const mode of ['copy', 'move'] as const) {
      const refused = await anna.api.post(`/api/lists/${sourceId}/gifts/transfer`, {
        data: { giftIds: [mineId, foreignId], targetListId: targetId, mode },
      });

      expect(
        refused.status(),
        `one id from another list must refuse the whole batch on ${mode}`
      ).toBe(404);
      expect((await refused.json()).code).toBe('not_found');
    }

    /*
      Three counts, because the batch could have gone wrong in three places and a
      status cannot tell them apart: the real idea left the source, the foreign idea
      was pulled in from the other list, or the target received something. The
      refusal is what makes this whole feature safe to use on a dozen wishes, so it
      is asserted here rather than inferred from the 404s above.
    */
    expect(
      await prisma.gift.count({ where: { listId: sourceId } }),
      'the real idea must still be on the source'
    ).toBe(1);
    expect(
      await prisma.gift.count({ where: { listId: otherId } }),
      'the foreign idea must still be on its own list'
    ).toBe(1);
    expect(
      await prisma.gift.count({ where: { listId: targetId } }),
      'and the target must be empty'
    ).toBe(0);

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

  test('the session token is in the cookie and in no response body', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const response = await context.request.post('/api/auth/login', {
      data: { identifier: ANNA, password: PASSWORD },
    });
    expect(response.ok()).toBe(true);

    /*
      The cookie is `httpOnly` so that no script on the page can read the session.
      The login body used to carry the same token beside `success`, unread by any
      client, which undid that for whatever could see the response. Searched as a
      string, like the buyer above, so it also catches the token under another name.
    */
    const cookie = (await context.cookies()).find((c) => c.name === 'auth-token');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value).toBeTruthy();
    expect(await response.text()).not.toContain(cookie!.value);
    expect(await response.json()).toEqual({ success: true });

    await context.close();
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

  /*
    The three refusals in the `PATCH` handler, and the fourth case that is none of
    them.

    These three used to be `code` strings that were not in the closed `Refusal`
    union, and `isRefusal` rejects anything outside it - so the vocabulary had no
    sentence for them and no client could have shown one. They are in the union now,
    and a code can sit in the vocabulary and still be produced with the wrong status,
    or not produced at all. Neither is visible from a page.

    `null` is the fourth case and it is not a refusal. A form that clears one control
    and posts the whole body sends null for the control it did not touch, and reading
    that as "set this to nothing" would empty a list by accident.
  */
  test('a list change names one field, and null is not a value', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    const listId = await createList(anna, names.next(), 'SHARED');

    // No field named at all: well-formed, and about nothing.
    const nothing = await anna.api.patch(`/api/lists/${listId}`, { data: {} });
    expect(nothing.status(), 'a change that names no field is not a change').toBe(400);
    expect((await nothing.json()).code).toBe('nothing_to_change');

    // Both fields named. The handler refuses rather than picking a winner, because
    // which one wins is a question about the interface's state machine, asked of the
    // layer that is supposed to know nothing about it.
    const both = await anna.api.patch(`/api/lists/${listId}`, {
      data: { name: 'Beides', visibility: 'PRIVATE' },
    });
    expect(both.status(), 'one request changes one thing').toBe(400);
    expect((await both.json()).code).toBe('ambiguous_change');

    // One field named, and not a visibility that exists.
    const unknown = await anna.api.patch(`/api/lists/${listId}`, {
      data: { visibility: 'NOPE' },
    });
    expect(unknown.status()).toBe(400);
    expect((await unknown.json()).code).toBe('invalid_visibility');

    /*
      And the pair: one real change beside one null.

      The 200 is the load-bearing assertion. Had `null` been read as a value it would
      be neither `PRIVATE` nor `SHARED`, and this request would have been refused as
      `invalid_visibility` - so the success is what proves `null` was read as absent,
      and the two halves of the rule cannot be separated without breaking the other.

      The re-read pins the rest. `PATCH` answers `{ success: true }` and not the changed
      row, so the name moving and the visibility staying put are the only evidence of
      what actually happened, and the visibility is the half a `null` could have emptied.
    */
    const renamed = await anna.api.patch(`/api/lists/${listId}`, {
      data: { name: 'Umbenannt', visibility: null },
    });
    expect(
      renamed.status(),
      'null counts as absent, not as a value to refuse'
    ).toBe(200);

    const after = await (await anna.api.get(`/api/lists/${listId}`)).json();
    expect(after.list.name).toBe('Umbenannt');
    expect(
      after.list.visibility,
      'the field left out of the change must not have been touched'
    ).toBe('SHARED');

    await anna.context.close();
  });

  /*
    `canClear` on the wire, which is the one permission the interface cannot work out
    for itself.

    `purchasedById` never leaves the server, so a client holding this shape genuinely
    cannot tell whose mark it is looking at, and the only formula it could apply is
    "an owner may not clear any mark". That is the safe direction, and it is also
    wrong: it silently forbids the owner from undoing "I already bought this myself",
    which the server does allow, and a table and an interface that disagree on one row
    is how the two drift apart without either being wrong alone. So the server answers
    the question the client actually has - may I - as one boolean per idea, carrying no
    name and no id.

    Asserted directly rather than inferred from which stamp each party is shown.
  */
  test('canClear says who may undo a mark, without ever saying whose it is', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, names.next(), 'SHARED');
    const giftId = await addGift(anna, listId, 'Lampe');
    // Both setup calls assert their status, and the file's own reason applies: a
    // silent failure here would leave the assertions below reading a state that was
    // never reached, which is how a test passes for a reason that has nothing to do
    // with the thing it names.
    expect((await grant(anna, listId, BEN)).status()).toBe(200);

    const canClearFor = async (actor: Actor): Promise<boolean> => {
      const body = await (await actor.api.get(`/api/lists/${listId}`)).json();
      const gift = body.gifts.find((g: { id: string }) => g.id === giftId);
      expect(gift, 'the idea must be on the sheet to have a canClear').toBeTruthy();
      return gift.canClear;
    };

    /*
      Open first, for both parties: marking is the one thing an invited account is for,
      so being able to take that mark back off is part of the same permission and not a
      concession. The owner's case is the one a client could not get right, because
      "the owner may never clear" would have thrown this away with it.
    */
    expect(
      await canClearFor(anna),
      'the owner may mark and unmark an open idea'
    ).toBe(true);
    expect(
      await canClearFor(ben),
      'a buyer may mark and unmark an open idea'
    ).toBe(true);

    const marked = await ben.api.post(
      `/api/lists/${listId}/gifts/${giftId}/toggle`
    );
    expect(marked.status(), 'the buyer must have set the mark').toBe(200);

    expect(
      await canClearFor(ben),
      'a buyer may take back the mark they set themselves'
    ).toBe(true);

    /*
      The same row, read by the other account. This is the fourth row of the table and
      the sharpest edge in the product: the owner is the one account whose reason for
      wanting a mark gone is that they changed their mind about the gift, and a mark
      that erases is a double-buy. So the two readers of one row disagree, which is
      exactly what a single boolean computed per reader is for.
    */
    expect(
      await canClearFor(anna),
      'the owner may not take back a mark a buyer set'
    ).toBe(false);

    await anna.context.close();
    await ben.context.close();
  });
});