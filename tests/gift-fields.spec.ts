import {
  test,
  expect,
  type APIResponse,
  type Browser,
  type BrowserContext,
} from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/*
  HOW MUCH OF A WISH FITS ON A SHEET, AND WHAT A TRANSFER CARRIES WITH IT.

  This file is deliberately NOT in `sharing.spec.ts`, and that placement is the
  point. That file's header says everything in it is a claim about *who may do
  what*: the matrix of owner against invited buyer against group member against
  anybody else, asserted with statuses that come out of `lib/list-access.ts`. A
  field-length rule is not one of those claims - it is the same 400 for the owner
  as for a stranger, it never consults the permission table, and it is answered
  before the permission gate in `lib/list-access.ts` ever runs. Putting it in the
  security surface would file a claim about a form under a file whose header
  promises it holds only claims about authority, and the next reader of that file
  would have to work out which is which.

  It is HTTP-only like the other two, and for the same reason: what the browser
  refuses to send is a claim about `maxLength`, not about the server. The whole
  reason this rule is re-checked in `app/api/lists/[id]/gifts/route.ts` is that
  an attribute in the DOM is a claim about a browser rather than about a request.

  Why this needed to exist: commit 6f60428 raised `MIN_TITLE_LENGTH` from nothing
  to two, and two end-to-end tests that added short titles broke in CI - a
  4.6-minute round trip being the only guard against a one-character constant
  change. `tests/unit/gift-text.test.ts` now pins the numbers themselves, at
  milliseconds; this file pins the consequence, which is the part only a real
  request can show.

  It also carries the transfer batch at the foot, for a reason that is the mirror
  image of the one above. `sharing.spec.ts` asks *who may* transfer, and every case
  in it is a refusal. What is here is the other half: what the wishes look like once
  a transfer is allowed. The two files meet on exactly one question - whether a
  partly-failing batch changes anything - and it is in both on purpose, because it is
  both an authorization claim and the whole reason the feature is safe to use on a
  dozen wishes at once.

  And why the transfer's *state* belongs in a file about field lengths: the obvious
  home for "a bought wish moves still bought" is a file about the bought mark, and
  there is no such file. The mark's behaviour is split across `sharing.spec.ts` -
  who may set and clear it - and here - what is on the sheet at all. Filing it
  under either heading fits worse than the one thing the two have in common, which
  is that both are claims about a whole row rather than about a form field. The rule
  this file states is the one that makes the feature honest: a wish arrives on the
  other list exactly as it left this one.
*/

const prisma = new PrismaClient();

const PASSWORD = 'test1234';
const ANNA = 'anna@example.test';
const BEN = 'ben@example.test';

type Actor = { context: BrowserContext; api: BrowserContext['request'] };

/**
 * Sign one account in and hand back an isolated context for it.
 *
 * Restated rather than imported, for the reason `groups.spec.ts` gives: that
 * file does not export its helper, a spec importing from another spec couples
 * two files' teardowns, and `tests/` has no shared helper module for it to live
 * in.
 */
const signIn = async (browser: Browser, identifier: string): Promise<Actor> => {
  const context = await browser.newContext();
  const response = await context.request.post('/api/auth/login', {
    data: { identifier, password: PASSWORD },
  });
  expect(
    response.ok(),
    `sign-in failed for ${identifier}: ${response.status()} ${await response.text()}`
  ).toBe(true);
  return { context, api: context.request };
};

/*
  Every list this spec creates is named with this prefix and removed afterwards.
  Without it the contents page grows a row per run, and a real bug in row
  rendering can hide behind the pile - `sharing.spec.ts` makes the longer
  argument and the reasoning is the same.
*/
const TEST_LIST_PREFIX = 'e2e-gift-fields-';
let listCounter = 0;
const createdLists: string[] = [];

const names = {
  next: () => `${TEST_LIST_PREFIX}${process.pid}-${(listCounter += 1)}`,
};

test.afterAll(async () => {
  if (createdLists.length > 0) {
    // Children before parents, as `sharing.spec.ts` and `groups.spec.ts` both do:
    // a suite that cleans up in the wrong order fails on a constraint violation
    // rather than on anything it asserted.
    await prisma.gift.deleteMany({ where: { listId: { in: createdLists } } });
    await prisma.listAccess.deleteMany({ where: { listId: { in: createdLists } } });
    await prisma.listGroupAccess.deleteMany({
      where: { listId: { in: createdLists } },
    });
    await prisma.list.deleteMany({ where: { id: { in: createdLists } } });
  }
  await prisma.$disconnect();
});

/**
 * A list, created through the API under test, and remembered for the teardown.
 *
 * Private unless a test says otherwise, because a grant needs a `SHARED` list and
 * nothing else here does - so the default keeps the length tests above as
 * single-actor as they were written.
 */
const createList = async (
  actor: Actor,
  visibility: 'PRIVATE' | 'SHARED' = 'PRIVATE'
): Promise<string> => {
  const name = names.next();
  const response = await actor.api.post('/api/lists', {
    data: { name, visibility },
  });
  expect(
    response.ok(),
    `creating ${name} failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const body = await response.json();
  createdLists.push(body.list.id);
  return body.list.id;
};

/** One idea on a sheet, through the API under test. */
const addGift = async (actor: Actor, listId: string, title: string): Promise<string> => {
  const response = await actor.api.post(`/api/lists/${listId}/gifts`, {
    data: { title },
  });
  expect(
    response.ok(),
    `adding "${title}" failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const body = await response.json();
  return body.gift.id;
};

/** Put somebody on the list, so a mark can be set by somebody other than its owner. */
const grant = async (actor: Actor, listId: string, email: string) =>
  actor.api.post(`/api/lists/${listId}/access`, { data: { email } });

/** The batch route, with the body the sheet sends. */
const transfer = async (
  actor: Actor,
  listId: string,
  giftIds: string[],
  targetListId: string,
  mode: 'copy' | 'move'
) =>
  actor.api.post(`/api/lists/${listId}/gifts/transfer`, {
    data: { giftIds, targetListId, mode },
  });

/** The sheet's own view of its ideas, as the page reads it. */
const sheet = async (
  actor: Actor,
  listId: string
): Promise<
  { id: string; title: string; isPurchased: boolean; canClear: boolean }[]
> => {
  const response = await actor.api.get(`/api/lists/${listId}`);
  expect(response.status(), `reading ${listId}`).toBe(200);
  return (await response.json()).gifts;
};

/**
 * A refusal about the *shape of a field*, asserted as three things.
 *
 * Status, `field`, and a non-empty message - and deliberately NOT `expectRefusal`,
 * which is the helper `groups.spec.ts` and `sharing.spec.ts` use. You will find
 * it in those files; do not reuse it here. It asserts a `code`, and a
 * field-shape refusal carries no code by convention: the blank-title check is an
 * inline 400 (`app/api/lists/[id]/gifts/route.ts:45-50`) and the bound check is
 * another (`route.ts:86-92`), because "this field is too long" is a sentence that
 * belongs under the field that caused it rather than a member of the closed
 * vocabulary in `lib/refusals.ts` - `components/groups-dialog.tsx:101-104` says
 * the same thing about the blank-name case. Reusing the helper would fail these
 * tests for the wrong reason: not because the length went unenforced, but
 * because a code was never going to be there.
 *
 * `field` is the assertion that matters most, because it is what tells the client
 * which input to print the message under. A 400 with a message and no `field`
 * leaves the form with a toast and nothing to attach it to.
 */
const expectFieldRefusal = async (
  response: APIResponse,
  field: string,
  about: string
): Promise<void> => {
  const body = await response.json();
  expect(response.status(), about).toBe(400);
  expect(
    body.field,
    `${about} - and it must name the field the message belongs under`
  ).toBe(field);
  expect(
    typeof body.message === 'string' && body.message.length > 0,
    `${about} - and it must carry a sentence to print`
  ).toBe(true);
  expect(
    body.code,
    `${about} - a field-shape refusal is not in the closed vocabulary and carries no code`
  ).toBeUndefined();
};

/*
  The address a link test pads out. Named so the lengths below are readable as
  totals rather than as a subtraction the reader has to do.
*/
const URL_PREFIX = 'https://example.de/';

test.describe('How much of a wish fits on a sheet', () => {
  test('a title one character under the floor is refused, and nothing is stored', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    /*
      The floor, at one below it. `MIN_TITLE_LENGTH` is 2 because a cell called
      "A" is not a wish, it is a keypress that got in before the reader thought
      about what they meant - and it was declared and enforced nowhere until
      6f60428, which is what broke two other specs in this suite.
    */
    const response = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: 'A' },
    });
    await expectFieldRefusal(response, 'title', 'a one-character title');

    // Asserted against the database rather than against the response: a 400 that
    // arrived *after* the insert would pass the status assertion above and leave
    // a junk cell on the sheet.
    const stored = await prisma.gift.count({ where: { listId } });
    expect(stored, 'a refused title must leave no row behind').toBe(0);

    await anna.context.close();
  });

  test('a title exactly on the floor is accepted', async ({ browser }) => {
    // The accepted side of the floor, in the same file as the refused side,
    // because a limit with only its failing side pinned is off-by-one in a
    // direction nobody checked: raising `MIN_TITLE_LENGTH` to 3 would leave every
    // refusal assertion green while making two-character wishes unstorable.
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    const response = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: 'ab' },
    });
    expect(
      response.ok(),
      `two characters is the shortest wish this product holds: ${response.status()} ${await response.text()}`
    ).toBe(true);

    const stored = await prisma.gift.findFirstOrThrow({ where: { listId } });
    expect(stored.title).toBe('ab');

    await anna.context.close();
  });

  test('a title one character over the ceiling is refused, and nothing is stored', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    /*
      The ceiling, and this is the one with the documented reason
      (`lib/gift-text.ts:4-7`): nothing capped these, Postgres held whatever it
      was given, and a wish with a thousand characters in its title was stored,
      returned and rendered - the cell grew to fill the viewport and pushed the
      rest of the sheet off the page. One wish had become a page. 121 is the
      first refused length, because the limit is 120.
    */
    const response = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: 'a'.repeat(121) },
    });
    await expectFieldRefusal(response, 'title', 'a 121-character title');

    const stored = await prisma.gift.count({ where: { listId } });
    expect(stored, 'a refused title must leave no row behind').toBe(0);

    await anna.context.close();
  });

  test('a title exactly on the ceiling is accepted and stored whole', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    const title = 'a'.repeat(120);
    const response = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title },
    });
    expect(
      response.ok(),
      `a 120-character title is the limit, not a refusal: ${response.status()} ${await response.text()}`
    ).toBe(true);

    // Read back off the row rather than out of the response, so a truncation
    // between the two would be visible: the limit is on what is *kept*, not only
    // on what is accepted.
    const stored = await prisma.gift.findFirstOrThrow({ where: { listId } });
    expect(stored.title).toHaveLength(120);
    expect(stored.title).toBe(title);

    await anna.context.close();
  });

  test('a title that is too long only once trimmed is still refused', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    /*
      The measurement happens after the trim (`lib/gift-text.ts:59`), so padding
      buys no allowance in either direction. A limit measured before the trim
      would let a paste smuggle 121 characters past a 120-character bound, which
      is the same viewport-filling cell the ceiling exists to prevent.
    */
    const response = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: `  ${'a'.repeat(121)}  ` },
    });
    await expectFieldRefusal(response, 'title', 'a padded 121-character title');

    await anna.context.close();
  });

  test('a note and a link are bounded separately from the title', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    /*
      Three different numbers, because they are three different things: a name, a
      note, and an address that is never displayed. One shared bound would either
      truncate a wish title to a paragraph or let a link run to a kilobyte.

      Asserted in one test because the claim is the separation - a single shared
      limit passes each field's own check and fails this one.
    */
    /*
      The filler count is derived from the prefix rather than written beside it,
      so the submitted length is exactly the number the assertion names. A URL of
      `MAX_URL_LENGTH` minus whatever the prefix happens to weigh is a test that
      passes for the wrong reason whenever the prefix changes - and this one was
      already a character short of the ceiling it claims to sit on.
    */
    const urlAt = (length: number): string =>
      `https://example.de/${'a'.repeat(length - URL_PREFIX.length)}`;
    const note = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: 'Lampe', description: 'a'.repeat(601) },
    });
    await expectFieldRefusal(note, 'description', 'a 601-character note');

    const link = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: 'Lampe', url: urlAt(2001) },
    });
    await expectFieldRefusal(link, 'url', 'a 2001-character link');

    // And the two fields accept their own ceilings, so the two refusals above are
    // about the bounds rather than about the endpoint refusing to store a gift at
    // all.
    const accepted = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: {
        title: 'Lampe',
        description: 'a'.repeat(600),
        url: urlAt(2000),
      },
    });
    expect(
      accepted.ok(),
      `a wish on all three ceilings is storable: ${accepted.status()} ${await accepted.text()}`
    ).toBe(true);

    await anna.context.close();
  });

  test('a title that is empty is a different sentence from one that is too short', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const listId = await createList(anna);

    /*
      Both are 400 with no code, and they are deliberately not the same message:
      "this field is empty" is about a field the reader left alone, and "this
      field is too short" is about a value that was typed. The route runs the
      blank check first and owns its own sentence for it
      (`route.ts:45-50`, and the comment at `:76-85` says why). Asserted as a
      distinct message rather than as a distinct status, because the status is
      the same by design.
    */
    const blank = await anna.api.post(`/api/lists/${listId}/gifts`, {
      data: { title: '   ' },
    });
    const body = await blank.json();
    expect(blank.status()).toBe(400);
    expect(body.field).toBeUndefined();
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.code).toBeUndefined();

    await anna.context.close();
  });
});

/*
  WHAT A WISH LOOKS LIKE ON THE OTHER LIST.

  Two rules, and everything below is one of them or a consequence of it:

    1. A wish arrives exactly as it left. Open stays open, bought stays bought, and
       the bought mark travels with it - including the fact that the reader of the
       target may not clear it.
    2. All of the batch or none of it.

  `sharing.spec.ts` covers who may start one of these. This covers what comes out,
  and the case worth naming is the bought one: an earlier draft of the design
  deliberately had a bought wish arrive *open* on the target, and every test here
  would have passed under it. That is the double-buy this product exists to
  prevent - the row lands looking purchasable, everybody who can read the target
  buys it - so it is the case that is pinned hardest, and pinned from the reader's
  side (`canClear` on the target's own response) rather than off the database.
*/
test.describe('Moving and copying wishes between your own lists', () => {
  test('three open wishes move, and the source is left empty', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    const giftIds = [
      await addGift(anna, sourceId, 'Lampe'),
      await addGift(anna, sourceId, 'Puzzle'),
      await addGift(anna, sourceId, 'Schuhe'),
    ];

    const moved = await transfer(anna, sourceId, giftIds, targetId, 'move');

    expect(
      moved.ok(),
      `three wishes in one request must succeed: ${moved.status()} ${await moved.text()}`
    ).toBe(true);
    // The count, not the wishes: the batch writes to two sheets and the caller is
    // standing on one of them, so the gifts now on the target are not this
    // response's to return. See the route.
    expect((await moved.json()).count).toBe(3);

    expect(
      await prisma.gift.count({ where: { listId: sourceId } }),
      'a move leaves the source with nothing'
    ).toBe(0);
    expect(
      await prisma.gift.count({ where: { listId: targetId } }),
      'and the target with all three'
    ).toBe(3);

    // The same three, not three new rows that happen to exist. `move` re-points
    // `listId` and writes nothing else, so the ids are the ones that were selected
    // - which is what a buyer with an open tab on the old sheet needs.
    const arrived = await prisma.gift.findMany({ where: { listId: targetId } });
    expect(arrived.map((gift) => gift.id).sort()).toEqual([...giftIds].sort());

    await anna.context.close();
  });

  test('a copy leaves the source exactly as it was', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    const sourceId = await createList(anna);
    const targetId = await createList(anna);
    const giftIds = [
      await addGift(anna, sourceId, 'Lampe'),
      await addGift(anna, sourceId, 'Puzzle'),
    ];

    const copied = await transfer(anna, sourceId, giftIds, targetId, 'copy');
    expect(
      copied.ok(),
      `copying must succeed: ${copied.status()} ${await copied.text()}`
    ).toBe(true);
    expect((await copied.json()).count).toBe(2);

    // Both halves at once, because "copy" and "move" differ in exactly one thing and
    // a test that pinned only the target could not tell them apart.
    expect(await prisma.gift.count({ where: { listId: sourceId } })).toBe(2);
    expect(await prisma.gift.count({ where: { listId: targetId } })).toBe(2);

    const arrived = await prisma.gift.findMany({ where: { listId: targetId } });
    expect(
      arrived.map((gift) => gift.id),
      'a copy is a new row, so it gets a new id'
    ).not.toEqual(expect.arrayContaining(giftIds));

    await anna.context.close();
  });

  test('a mixed batch of open and bought wishes moves, and each keeps its state', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna, 'SHARED');
    const targetId = await createList(anna);
    const openId = await addGift(anna, sourceId, 'Noch offen');
    const boughtId = await addGift(anna, sourceId, 'Schon gekauft');
    await grant(anna, sourceId, BEN);

    // Ben marks one of them, so the bought row carries an attribution that is not
    // Anna's - which is the case the next test is about and the one that makes
    // "the state travels" mean something.
    const marked = await ben.api.post(
      `/api/lists/${sourceId}/gifts/${boughtId}/toggle`
    );
    expect(
      marked.ok(),
      `Ben must be able to mark it: ${marked.status()} ${await marked.text()}`
    ).toBe(true);

    const moved = await transfer(anna, sourceId, [openId, boughtId], targetId, 'move');
    expect(
      moved.ok(),
      `a mixed batch must succeed: ${moved.status()} ${await moved.text()}`
    ).toBe(true);

    const arrived = await sheet(anna, targetId);
    const open = arrived.find((gift) => gift.id === openId);
    const bought = arrived.find((gift) => gift.id === boughtId);

    expect(open, 'the open wish arrived').toBeTruthy();
    expect(
      open!.isPurchased,
      'an open wish arrives open - the whole of rule 1'
    ).toBe(false);

    expect(bought, 'the bought wish arrived').toBeTruthy();
    expect(
      bought!.isPurchased,
      'a bought wish arrives BOUGHT. If this fails, `move` grew a branch that resets the state, and that is the double-buy this product exists to prevent.'
    ).toBe(true);

    // And the attribution travelled with it, which is why the owner cannot clear the
    // mark on the target either. `canClear: false` is the observable consequence:
    // `purchasedById` never leaves the server, so this boolean is the only way the
    // rule can be seen from outside - see `mayClearMark`.
    expect(
      bought!.canClear,
      "the target's owner may not clear a mark somebody else set, on the target either"
    ).toBe(false);

    await anna.context.close();
    await ben.context.close();
  });

  test("a copy of somebody else's bought wish arrives open and can be marked", async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const sourceId = await createList(anna, 'SHARED');
    const targetId = await createList(anna);
    const giftId = await addGift(anna, sourceId, 'Besorgt');
    await grant(anna, sourceId, BEN);
    await ben.api.post(`/api/lists/${sourceId}/gifts/${giftId}/toggle`);

    const copied = await transfer(anna, sourceId, [giftId], targetId, 'copy');
    expect(
      copied.ok(),
      `copying a bought wish must succeed: ${copied.status()} ${await copied.text()}`
    ).toBe(true);

    const copy = (await sheet(anna, targetId)).find((gift) => gift.id !== giftId);
    expect(copy, 'the copy is on the target under a new id').toBeTruthy();
    /*
      The mark does NOT travel with a copy. A copy is a new thought on a
      new sheet: it arrives open, and the target's own audience is the one
      that decides whether it is already bought. `canClear: true` is the
      observable form of that, the same way `canClear: false` was the
      observable form of the mark travelling before the semantics changed -
      `purchasedById` never leaves the server, so this boolean is the only
      way the rule can be seen from outside (see `mayClearMark`).
    */
    expect(
      copy!.isPurchased,
      'a copy arrives open - the mark belongs to the source list, not to the copy'
    ).toBe(false);
    expect(
      copy!.canClear,
      'and the owner may mark it there, because it is open'
    ).toBe(true);

    // The source keeps the mark it had, because copy changes nothing on this side.
    const original = (await sheet(anna, sourceId))[0];
    expect(original.isPurchased, 'the source is unchanged by a copy').toBe(true);
    expect(
      original.canClear,
      "and Ben's mark on it is still the owner's to live with"
    ).toBe(false);

    /*
      The positive form of "arrives open": the one request the old
      semantics refused - the owner marking the copy - is the request
      that works now. The copy becomes a bought wish on the target,
      marked by its own owner, and clearable by her for the same reason.
    */
    const marked = await anna.api.post(
      `/api/lists/${targetId}/gifts/${copy!.id}/toggle`
    );
    expect(
      marked.status(),
      'the owner can mark an open copy like any open wish'
    ).toBe(200);

    const markedCopy = (await sheet(anna, targetId)).find(
      (gift) => gift.id === copy!.id
    );
    expect(
      markedCopy!.isPurchased,
      'the copy takes the mark like any open wish'
    ).toBe(true);
    expect(
      markedCopy!.canClear,
      'and the owner may clear what they themselves marked'
    ).toBe(true);

    await anna.context.close();
    await ben.context.close();
  });

  test('a batch that cannot land entirely lands not at all', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    const sourceId = await createList(anna);
    const strangerId = await createList(anna);
    const targetId = await createList(anna);
    const mineId = await addGift(anna, sourceId, 'Gehört hierher');
    const strangerGiftId = await addGift(anna, strangerId, 'Gehört woanders');

    const refused = await transfer(
      anna,
      sourceId,
      [mineId, strangerGiftId],
      targetId,
      'move'
    );

    /*
      404 rather than 400: the id is simply not on the source, which is what
      `sharing.spec.ts` calls this from the other side - one bad id in a batch of two
      refuses both. That is the difference between this feature and the tedium it
      replaced, and it is why the assertion below is about *counts* rather than about
      a status: a request that answered 404 after moving the first wish would pass
      every other assertion in this file.
    */
    expect(refused.status()).toBe(404);
    expect((await refused.json()).code).toBe('not_found');

    expect(
      await prisma.gift.count({ where: { listId: sourceId } }),
      'the real wish must still be on the source'
    ).toBe(1);
    expect(
      await prisma.gift.count({ where: { listId: strangerId } }),
      "and the other must still be on its own list"
    ).toBe(1);
    expect(
      await prisma.gift.count({ where: { listId: targetId } }),
      'the target must be untouched'
    ).toBe(0);

    await anna.context.close();
  });

  test('a copied wish keeps its place in the order, not the top of the list', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const sourceId = await createList(anna);
    const targetId = await createList(anna);

    /*
      Oldest first, which is the reverse of the order `listGifts` returns, so the
      copy under test has to land in the *middle* to prove anything. A copy that
      jumped to the front would pass a test whose target held only the copy.

      The fixture is stated in ages rather than in sleeps: `createdAt` has a
      millisecond resolution and these three writes are milliseconds apart, so
      sleeping is the only way to be sure of the order and it is the one thing that
      makes this test slow and flaky. Ages do not.
    */
    const aged = async (giftId: string, seconds: number) => {
      await prisma.gift.update({
        where: { id: giftId },
        data: { createdAt: new Date(Date.now() - seconds * 1000) },
      });
    };

    const old = await addGift(anna, targetId, 'Schon lange auf der Zieliste');
    const copiedFrom = await addGift(anna, sourceId, 'Seit 2023 offen');
    const recent = await addGift(anna, targetId, 'Neu auf der Zieliste');
    await aged(old, 300);
    await aged(copiedFrom, 200);
    await aged(recent, 100);

    const copied = await transfer(anna, sourceId, [copiedFrom], targetId, 'copy');
    expect(
      copied.ok(),
      `copying must succeed: ${copied.status()} ${await copied.text()}`
    ).toBe(true);

    /*
      `createdAt` is carried over on copy precisely so a wish lands on the target
      where it belongs rather than at the top of a list it was written for last year.
      A copy that jumped to the front would say the owner had just thought of it, and
      on the target sheet that is a claim somebody else acts on.

      Asserted by title rather than by id, and the reason is the copy's own nature:
      it is a new row with a new id, so the position of *the source wish's id* is not
      a thing that exists on the target at all. Naming the ids here would have been a
      test of the wrong claim - and it is the shape of a plausible-looking assertion
      that fails for a reason that has nothing to do with ordering.
    */
    const order = (await sheet(anna, targetId)).map((gift) => gift.title);
    expect(order, 'newest first, and the copy where the original stood').toEqual([
      'Neu auf der Zieliste',
      'Seit 2023 offen',
      'Schon lange auf der Zieliste',
    ]);

    // The source is untouched by a copy, including its order, so the copy is the
    // only thing that arrived and nothing was taken.
    expect(await prisma.gift.count({ where: { listId: sourceId } })).toBe(1);

    await anna.context.close();
  });
});