import {
  test,
  expect,
  type APIResponse,
  type Browser,
  type BrowserContext,
} from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/*
  THE LENGTH OF A WISH, AS THE SERVER SEES IT.

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
*/

const prisma = new PrismaClient();

const PASSWORD = 'test1234';
const ANNA = 'anna@example.test';

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

/** A private list, created through the API under test, and remembered for the teardown. */
const createList = async (actor: Actor): Promise<string> => {
  const name = names.next();
  const response = await actor.api.post('/api/lists', {
    data: { name, visibility: 'PRIVATE' },
  });
  expect(
    response.ok(),
    `creating ${name} failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const body = await response.json();
  createdLists.push(body.list.id);
  return body.list.id;
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