import {
  test,
  expect,
  type APIResponse,
  type Browser,
  type BrowserContext,
} from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/*
  GROUPS, AND THE REACH ONE IS SUPPOSED TO HAVE.

  HTTP-only, like `sharing.spec.ts` and for the same reason: every claim here is about
  what an account is *allowed*, and an account with a valid session that never touches
  the interface is exactly the case the permission tables exist for. No `page` fixture
  and no `data-testid` appears below. A control's absence proves what the interface
  offers; a status proves what the server permits; only the second is the claim, and the
  rules being checked live in two modules rather than in a design document:

      lib/group-access.ts   what may be done to a group, and by whom
      lib/list-access.ts    what a member of a group may do to a list

  Their headers carry the tables. Four rules run under them and each is asserted where
  it can be: every group lookup is scoped to its owner, so a membership id is only
  reachable through the group it is in; a group that is not yours is `no_such_group`
  and never `forbidden`; membership is not browsable, so a member cannot even read the
  group that reached them; and going private closes the reads a `ListGroupAccess` row
  still justifies, without deleting that row.

  Two cases are asserted directly rather than left to the matrix below, because they
  are the two that fail loudly the moment membership is reimplemented as a snapshot -
  writing a `ListAccess` row per current member when a group is granted:

    - an account holding both an individual grant and a group grant keeps its
      individual one after being removed from the group, and
    - an account added to the group *after* the grant reads the list immediately,
      with no re-share and nothing to backfill.

  A snapshot passes every other test in this file, which is what makes these two the
  ones worth naming out loud: they are the difference between `readableBy` walking a
  `GroupMember` row on every read and the audience having been written down somewhere
  once. The refusal codes are asserted beside their statuses everywhere, separately and
  always, because the client narrows on the code (`isRefusal` is what turns an unknown
  string into a refusal with a sentence) and a status-only assertion passes against a
  404 that carries no code at all.

  Every actor signs in through the real login route and each gets its own browser
  context, so each has its own cookie jar. The three accounts come from
  `prisma/seed.mjs` and no row is written with Prisma to make one, so what this suite
  asserts is the shipped seed rather than a fixture built to agree with it. Prisma
  appears below exactly once, in the teardown.
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
 * Restated rather than imported from `sharing.spec.ts`: that file does not export it,
 * a spec that imported from another spec would couple two files' teardowns to one
 * another's, and `tests/` has no shared helper module for it to live in. It is four
 * lines, and the alternative is worse than the duplication.
 *
 * `identifier`, because that is the field name the login route reads: one input takes
 * either the nickname or the address.
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
  Every group and list this spec makes is named with this prefix and removed afterwards.

  The name carries the pid and a counter because `Group` is `@@unique([ownerId, name])`
  rather than unique on the name alone - so a fixed name makes the second run of a file
  that crashed mid-test fail on `duplicate_group_name` and say nothing about groups. The
  same accumulation argument `sharing.spec.ts` makes for its lists applies with more
  force here: a group is a row nothing prunes on its own, and a leftover one with a
  leftover member would be reachable by the next run through `GET /api/groups`.
*/
const TEST_PREFIX = 'e2e-groups-';
let counter = 0;
const names = { next: () => `${TEST_PREFIX}${process.pid}-${(counter += 1)}` };

const createdLists: string[] = [];
const createdGroups: string[] = [];

test.afterAll(async () => {
  if (createdLists.length > 0 || createdGroups.length > 0) {
    /*
      Children before parents, and the two tables that reference a list *and* a group have
      to go before both of them - `listGroupAccess` is one, and `groupMember` points at a
      group and at an account, so it is emptied before either. `prisma/seed.mjs` resets
      in the same order and explains why at greater length; this copy exists because a
      suite that cleans up in the wrong order fails on a constraint violation rather than
      on anything it asserted.

      `listGroupAccess` is emptied twice on purpose, once per parent it can hang off. A
      group deleted through the API in one of the tests below takes its own grants with
      it, so the second call is usually a no-op - but "usually" is not an ordering.
    */
    await prisma.gift.deleteMany({ where: { listId: { in: createdLists } } });
    await prisma.listAccess.deleteMany({ where: { listId: { in: createdLists } } });
    await prisma.listGroupAccess.deleteMany({
      where: { listId: { in: createdLists } },
    });
    await prisma.list.deleteMany({ where: { id: { in: createdLists } } });
    await prisma.groupMember.deleteMany({
      where: { groupId: { in: createdGroups } },
    });
    await prisma.listGroupAccess.deleteMany({
      where: { groupId: { in: createdGroups } },
    });
    await prisma.group.deleteMany({ where: { id: { in: createdGroups } } });
  }
  await prisma.$disconnect();
});

/**
 * A refusal, pinned as both halves.
 *
 * Status and `code` separately, always, and the `code` is the second assertion rather
 * than a detail of the first: the client narrows on the code, so a 404 with no code
 * would leave the interface a number to read and nothing to say. The body comes back so
 * a caller can go on to assert what did *not* happen - that no grant was written, that
 * no membership survived - which is usually the half that matters.
 */
const expectRefusal = async (
  response: APIResponse,
  status: number,
  code: string,
  about: string
): Promise<Record<string, unknown>> => {
  const body = await response.json();
  expect(response.status(), about).toBe(status);
  expect(body.code, `${about} - and it must carry the code the client narrows on`)
    .toBe(code);
  return body;
};

/** A list, created through the API under test, and remembered for the teardown. */
const createList = async (
  actor: Actor,
  visibility: 'PRIVATE' | 'SHARED'
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

/** An idea on a list, so the mark and the idea-deletion rules have something to act on. */
const addGift = async (
  actor: Actor,
  listId: string,
  title: string
): Promise<string> => {
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

/**
 * A group, and the name it was made under.
 *
 * The name is a parameter because one test needs to make the same name twice, and the
 * seeded name is not reused for anything: a name is one owner's to take
 * (`@@unique([ownerId, name])`), and borrowing a seeded one would put a throwaway row
 * next to the demo data this suite is meant to be asserting about.
 */
const createGroup = async (
  actor: Actor,
  name: string = names.next()
): Promise<{ id: string; name: string; memberCount: number }> => {
  const response = await actor.api.post('/api/groups', { data: { name } });
  expect(
    response.ok(),
    `creating ${name} failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  const body = await response.json();
  createdGroups.push(body.group.id);
  return body.group;
};

/** Somebody into a group. Status asserted here, because a silent 4xx above is a lie. */
const addMember = async (
  actor: Actor,
  groupId: string,
  accountId: string
): Promise<{ id: string; accountId: string; nickname: string }> => {
  const response = await actor.api.post(`/api/groups/${groupId}/members`, {
    data: { accountId },
  });
  expect(
    response.ok(),
    `putting ${accountId} into ${groupId} failed: ${response.status()} ${await response.text()}`
  ).toBe(true);
  return (await response.json()).member;
};

const grantGroup = (actor: Actor, listId: string, groupId: string) =>
  actor.api.post(`/api/lists/${listId}/access`, { data: { groupId } });

const grantPerson = (actor: Actor, listId: string, email: string) =>
  actor.api.post(`/api/lists/${listId}/access`, { data: { email } });

/**
 * Move a list between the two visibilities, asserting the 200.
 *
 * Three of the tests below pause a list and unpause it again, and in each the argument is
 * about what pausing does to a grant rather than about the request - so the request gets
 * a name and the assertion lives inside it.
 */
const setVisibility = async (
  actor: Actor,
  listId: string,
  visibility: 'PRIVATE' | 'SHARED'
): Promise<void> => {
  const response = await actor.api.patch(`/api/lists/${listId}`, {
    data: { visibility },
  });
  expect(response.status(), `making the list ${visibility}`).toBe(200);
};

/**
 * The whole sheet, for whoever is allowed to read it.
 *
 * The audience - people and groups - is the only place either is visible, so this is
 * the authoritative read for "who reaches this list" and for "the grant is still there".
 * There is no `GET /api/lists/{id}/access`: the grant route is POST-only, which is the
 * same trap `sharing.spec.ts` records a first draft of itself falling into.
 */
const sheet = async (actor: Actor, listId: string) => {
  const response = await actor.api.get(`/api/lists/${listId}`);
  expect(response.status(), 'reading the sheet').toBe(200);
  return response.json();
};

/**
 * Every group this account owns.
 *
 * The rename is confirmed here and not off the `PATCH` answer, and specifically not off
 * `GET /api/groups/{id}`: that route answers the membership and has never carried the
 * group row, so a test re-reading the detail route for a new name would be looking for
 * a field the endpoint does not have.
 */
const groupsOf = async (actor: Actor) => {
  const response = await actor.api.get('/api/groups');
  expect(response.status(), 'reading the groups I own').toBe(200);
  return (await response.json()).groups;
};

/**
 * One row of the caller's own group collection.
 *
 * A group row is answered there and nowhere else - `GET /api/groups` is the only route
 * that carries `name` or `memberCount` - so anything about a group's own row has to be
 * read here. The existence check is in the helper rather than in each caller, because
 * `undefined.memberCount` would be a `TypeError` instead of a sentence about which group
 * went missing.
 */
const groupRowOf = async (actor: Actor, groupId: string) => {
  const row = (await groupsOf(actor)).find((g: { id: string }) => g.id === groupId);
  expect(row, 'the group must be in the collection of the account that owns it')
    .toBeTruthy();
  return row;
};

/** The people in a group, which is the owner's business and nobody else's. */
const membersOf = async (actor: Actor, groupId: string) => {
  const response = await actor.api.get(`/api/groups/${groupId}`);
  expect(response.status(), 'reading a group I own').toBe(200);
  return (await response.json()).members;
};

/**
 * The signed-in account's own id.
 *
 * There is no "who am I" endpoint, and there is not meant to be one: nothing in the
 * product needs the client to name its own account, because every route takes it from
 * the session. The one assertion that needs it is `cannot_join_own_group`, whose whole
 * subject is an account putting *itself* into a group - so the id is read off a list
 * that account owns, which is the one place the wire already carries it.
 */
const ownAccountId = async (actor: Actor): Promise<string> => {
  const response = await actor.api.get('/api/lists');
  expect(response.status(), 'reading my own lists').toBe(200);
  const body = await response.json();
  const id = body.owned?.[0]?.ownerId;
  expect(id, 'this account must own a list for its own id to be readable')
    .toBeTruthy();
  return id;
};

/**
 * Somebody else's account id, found the way the product finds one.
 *
 * `POST /api/groups/{id}/members` accepts an account id and nothing else, precisely
 * because turning a typed name into an account is `GET /api/accounts/search`'s job, so
 * this is the same pair of routes the sharing dialog uses. Reaching into Prisma for the
 * id instead would be asserting against a fixture rather than against the seed, which
 * is the thing `sharing.spec.ts:36-38` refuses to do.
 */
const findAccountId = async (actor: Actor, query: string): Promise<string> => {
  const response = await actor.api.get(
    `/api/accounts/search?q=${encodeURIComponent(query)}`
  );
  expect(
    response.status(),
    `looking "${query}" up failed: ${response.status()} ${await response.text()}`
  ).toBe(200);
  const body = await response.json();
  const match = body.results.find(
    (row: { nickname: string }) => row.nickname === query
  );
  expect(
    match,
    `"${query}" must be findable, or this test is about nothing`
  ).toBeTruthy();
  return match.id;
};

test.describe('A group, and who may touch it', () => {
  test('an owner makes a group, renames it, and reads both back', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const created = await createGroup(anna);
    expect(created.memberCount, 'a new group holds nobody').toBe(0);
    // The collection shows it, under the name it was made with - and that same read is
    // what confirms the rename below, so the name is pinned on both sides of it.
    expect((await groupRowOf(anna, created.id)).name).toBe(created.name);

    // A second name, from the same counter, so a rename target is never a name already
    // in use - which is what lets the rename below be a rename and not a duplicate.
    const renamed = names.next();
    const patched = await anna.api.patch(`/api/groups/${created.id}`, {
      data: { name: renamed },
    });
    expect(patched.status()).toBe(200);

    /*
      `PATCH` answers `{ success: true }` and not the changed row, for the reason
      `app/api/groups/[id]/route.ts` gives: `memberCount` on that row is untouched by a
      rename and would arrive one round trip late. So the effect is confirmed by
      re-reading the collection, which is where a name is authoritative.
    */
    expect((await groupRowOf(anna, created.id)).name).toBe(renamed);

    await anna.context.close();
  });

  test('a name is one account to take, and a rename to its own name is not one', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const name = names.next();
    const first = await createGroup(anna, name);

    // The unique index is `@@unique([ownerId, name])`, so a name is a promise the owner
    // makes about their own rows. Two "Family" groups in two households is the product
    // working; two in one is a person unable to tell them apart in the dialog.
    await expectRefusal(
      await anna.api.post('/api/groups', { data: { name } }),
      400,
      'duplicate_group_name',
      'two groups under one name in one account is one too many'
    );

    // Which is why the same name is not refused for somebody else.
    const bens = await createGroup(ben, name);
    expect(bens.name).toBe(name);

    // A rename into a name this owner already holds is the same refusal, caught from the
    // index rather than from a pre-check - `lib/group-access.ts` argues at length why
    // there is no pre-check, and a rename is the case where one would be wrong.
    const other = await createGroup(anna);
    await expectRefusal(
      await anna.api.patch(`/api/groups/${other.id}`, { data: { name } }),
      400,
      'duplicate_group_name',
      'renaming onto a name this account already holds'
    );

    /*
      And the case that is not a duplicate: a group renamed to the name it already has.
      A pre-check would need an `id` exclusion to avoid refusing this, and would then be
      a second place to get the answer wrong about something that is not wrong at all.
    */
    const toItsOwnName = await anna.api.patch(`/api/groups/${first.id}`, {
      data: { name },
    });
    expect(toItsOwnName.status(), 'a group may keep the name it has').toBe(200);

    await anna.context.close();
    await ben.context.close();
  });

  test('a group that is not yours is told there is nothing there', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const group = await createGroup(anna);
    // With a member in it, so the refusals below are about a group that really exists
    // and really has something to disclose - an empty one would be a weaker version of
    // the same claim.
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));

    const codes: unknown[] = [];
    for (const [what, response] of [
      ['read the members', ben.api.get(`/api/groups/${group.id}`)],
      [
        'rename it',
        ben.api.patch(`/api/groups/${group.id}`, { data: { name: names.next() } }),
      ],
      ['delete it', ben.api.delete(`/api/groups/${group.id}`)],
    ] as [string, Promise<APIResponse>][]) {
      const body = await expectRefusal(
        await response,
        404,
        'no_such_group',
        `Ben must not be able to ${what}`
      );
      codes.push(body.code);
    }

    /*
      `forbidden` never appears, and that is a claim rather than a restatement of the
      code above. A 403 says "this is here and you may not touch it", which is a
      sentence about a group Ben has no relationship to. `no_such_group` is the same
      answer whether the group is somebody else's or does not exist, so the two cases are
      indistinguishable from outside - which is the property, and it is why it is
      checked here rather than read off the assertion above.
    */
    expect(codes, 'a group refusal may never be a 403').not.toContain('forbidden');

    // And that is literally the answer: an id that names nothing at all is refused
    // identically, so the two refusals cannot be told apart by their status, their code
    // or their body.
    await expectRefusal(
      await ben.api.get('/api/groups/no-such-group'),
      404,
      'no_such_group',
      'a group that does not exist is refused the same way'
    );

    // The group is untouched by all three refusals, which is what makes them refusals.
    expect(await membersOf(anna, group.id)).toHaveLength(1);
    expect((await groupRowOf(anna, group.id)).memberCount).toBe(1);

    /*
      And Ben's own collection does not contain it. That is header rule 3 of
      `lib/group-access.ts` rather than an omission: `groupsForAccount` returns the
      groups an account owns and there is deliberately no function returning the groups
      an account is *in*, because whose group somebody is in is the owner's business.
    */
    expect(
      (await groupsOf(ben)).map((g: { id: string }) => g.id),
      'being in a group is not something a member can browse'
    ).not.toContain(group.id);

    await anna.context.close();
    await ben.context.close();
  });
});

test.describe('Who is in a group', () => {
  test('an owner puts somebody in and takes them out', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const group = await createGroup(anna);
    const benId = await findAccountId(anna, 'ben');
    const member = await addMember(anna, group.id, benId);

    // The member row is the owner's view of a person, and it is built by flattening the
    // account's columns in rather than nesting them - which is exactly the arrangement
    // that would carry a new column out silently, so `password` is checked by name.
    expect(member.accountId).toBeTruthy();
    expect(JSON.stringify(member)).not.toContain('password');
    const [inIt] = await membersOf(anna, group.id);
    expect(inIt.email).toBe(BEN);
    expect(inIt.id).toBe(member.id);

    /*
      The count on the collection row moves with the membership, in the request after it.
      Two counts for one fact is the arrangement `readableListSummary` and
      `groupsForAccount` both give reasons for - and a count that lagged here would make
      the dialog print "3 people" over a list of four, which is the failure the
      round-trip-carrying is for.
    */
    expect((await groupRowOf(anna, group.id)).memberCount).toBe(1);

    /*
      Ben cannot read his own membership. He learns he has reached a list by opening it,
      and there is no endpoint that would tell him whose group he is in - a group is
      somebody's private arrangement and this one happens to reach him.
    */
    await expectRefusal(
      await ben.api.get(`/api/groups/${group.id}`),
      404,
      'no_such_group',
      'a member must not be able to read the group that reached them'
    );

    const removed = await anna.api.delete(
      `/api/groups/${group.id}/members/${member.id}`
    );
    expect(removed.status()).toBe(200);
    expect(await membersOf(anna, group.id), 'the membership is gone').toHaveLength(
      0
    );
    expect((await groupRowOf(anna, group.id)).memberCount).toBe(0);

    await anna.context.close();
    await ben.context.close();
  });

  test('an account that does not exist cannot be put in a group', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const group = await createGroup(anna);
    await expectRefusal(
      await anna.api.post(`/api/groups/${group.id}/members`, {
        data: { accountId: 'no-such-account' },
      }),
      404,
      'no_such_account',
      'a membership names an account, and that account has to exist'
    );
    expect(await membersOf(anna, group.id)).toHaveLength(0);

    await anna.context.close();
  });

  test('an owner cannot be a member of their own group', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    const group = await createGroup(anna);
    const own = await ownAccountId(anna);

    /*
      Its own code, and both of the codes it is not are asserted by being pinned here:
      `cannot_share_with_owner` means "this grant adds nothing", which would be a false
      description of an owner in their own group, and `forbidden`'s sentence is about a
      list - "this list does not grant that" - which would be read in a dialog that is
      not about a list. The closed vocabulary is where that mismatch is meant to be
      impossible, and `403` is a status an owner is *not* refused here.
    */
    await expectRefusal(
      await anna.api.post(`/api/groups/${group.id}/members`, {
        data: { accountId: own },
      }),
      403,
      'cannot_join_own_group',
      'an owner is not a member of their own group'
    );
    expect(await membersOf(anna, group.id)).toHaveLength(0);
    expect((await groupRowOf(anna, group.id)).memberCount).toBe(0);

    await anna.context.close();
  });

  test('putting somebody in twice is one membership, and it says so', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const benId = await findAccountId(anna, 'ben');

    const group = await createGroup(anna);
    const first = await addMember(anna, group.id, benId);
    const again = await addMember(anna, group.id, benId);

    /*
      A 200 with the same row, not a refusal, and the refusal is what the table does not
      have: `already_shared` is a list grant, `duplicate_group_name` is a name, and
      `nothing_to_change` is about a body that named neither or both of its fields.
      None of those is the sentence for "they are already in this group", and a code the
      product cannot word is not a code to invent in a handler. Returning the row is
      honest because the requested state is now the actual state.
    */
    expect(again.id, 'the same membership row, not a second one').toBe(first.id);
    expect(await membersOf(anna, group.id)).toHaveLength(1);
    expect((await groupRowOf(anna, group.id)).memberCount).toBe(1);

    await anna.context.close();
  });

  test('a membership id is only removable through the group it is in', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const one = await createGroup(anna);
    const two = await createGroup(anna);
    const member = await addMember(anna, one.id, await findAccountId(anna, 'ben'));

    /*
      Both groups are Anna's, so this is not a permissions case at all - it is the
      cross-group lookup, and it is the exact query whose absence cost this product an
      existence oracle once: a membership id found by id alone, failing the group check
      it was supposed to be scoped by, and turning into a deletion of somebody else's
      row or a throw. `removeMember` scopes by `{ id, groupId }`, and the refusal is
      `not_found` rather than `no_such_group` because the gate above it has already
      established that this group is the caller's - so there is nothing left to conceal.
    */
    await expectRefusal(
      await anna.api.delete(`/api/groups/${two.id}/members/${member.id}`),
      404,
      'not_found',
      'a membership belongs to the group it is in'
    );
    expect(
      await membersOf(anna, one.id),
      'the membership it named is still standing'
    ).toHaveLength(1);
    expect(await membersOf(anna, two.id)).toHaveLength(0);

    // And the same id through its own group is the ordinary case.
    expect(
      (await anna.api.delete(`/api/groups/${one.id}/members/${member.id}`)).status()
    ).toBe(200);

    await anna.context.close();
  });

  test('a stranger can neither add nor remove a member', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const group = await createGroup(anna);
    const benId = await findAccountId(anna, 'ben');
    const member = await addMember(anna, group.id, benId);

    await expectRefusal(
      await ben.api.post(`/api/groups/${group.id}/members`, {
        data: { accountId: await findAccountId(ben, 'mia') },
      }),
      404,
      'no_such_group',
      'a stranger must not be able to put somebody into a group'
    );
    await expectRefusal(
      await ben.api.delete(`/api/groups/${group.id}/members/${member.id}`),
      404,
      'no_such_group',
      'a stranger must not be able to empty a group'
    );

    expect(
      await membersOf(anna, group.id),
      'neither request changed the group'
    ).toHaveLength(1);

    await anna.context.close();
    await ben.context.close();
  });
});

test.describe('What a group does for a list', () => {
  test('a group reaches a list its members could not otherwise read', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);
    const mia = await signIn(browser, MIA);

    const listId = await createList(anna, 'SHARED');
    await addGift(anna, listId, 'Kaffeemühle');
    const group = await createGroup(anna);
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));

    const granted = await grantGroup(anna, listId, group.id);
    expect(granted.status(), 'a shared list may be shared with a group').toBe(200);
    const grantBody = await granted.json();
    expect(grantBody.groupAccess.groupId).toBe(group.id);
    expect(grantBody.groupAccess.memberCount).toBe(1);

    /*
      The audience is one group row and no person row, and the two counts are counted
      beside each other rather than summed into one "shared with 1" figure: individuals
      and group members overlap, so somebody in two granted groups is one reader and a
      sum would say two. This is the arrangement `lib/list-access.ts` argues for at
      `sharedWithCount`.
    */
    const owner = await sheet(anna, listId);
    expect(
      owner.access,
      'reach came from the group, so nobody was granted'
    ).toHaveLength(0);
    expect(owner.groupAccess).toHaveLength(1);
    expect(owner.list.sharedWithCount).toBe(0);
    expect(owner.list.sharedWithGroupCount).toBe(1);

    const read = await ben.api.get(`/api/lists/${listId}`);
    expect(
      read.status(),
      'a member may read a list reached through a group'
    ).toBe(200);
    const benSees = await read.json();
    // Asserted against the whole serialized body rather than a field path: the point is
    // that the member can *see* the idea, not which nesting level the handler chose.
    expect(JSON.stringify(benSees)).toContain('Kaffeemühle');
    // ...and is not shown the audience for it, exactly as an invited buyer is not. The
    // list they can read does not come with a directory of everyone else who can.
    expect(benSees.access).toHaveLength(0);

    await expectRefusal(
      await mia.api.get(`/api/lists/${listId}`),
      404,
      'not_found',
      'an account that is not in the group must not reach the list'
    );

    // And it is on the contents page, so the reach is a row rather than a URL that works.
    const benLists = await (await ben.api.get('/api/lists')).json();
    expect(benLists.shared.map((l: { id: string }) => l.id)).toContain(listId);

    await anna.context.close();
    await ben.context.close();
    await mia.context.close();
  });

  /*
    The "in a group" column of the table in `lib/list-access.ts`, asserted in both
    directions: the same account, reaching the list through a `ListGroupAccess` row
    instead of a `ListAccess` one, gets exactly the row an invited buyer gets.

    403 rather than 404 throughout, and the reason is the same one the table gives: Ben
    can already read this list, so confirming it exists leaks nothing, and 403 is the
    status that tells the interface the control was never his to press. A 404 here would
    mean a group grant produced *less* than an individual one, which is a fourth
    permission tier this product does not have.
  */
  test('a member gets the invited account row in both directions', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, 'SHARED');
    const giftId = await addGift(anna, listId, 'Lampe');
    const group = await createGroup(anna);
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));
    const grant = await grantGroup(anna, listId, group.id);
    expect(grant.status()).toBe(200);
    const groupAccessId = (await grant.json()).groupAccess.id;
    // Ben's own group, so the "grant a group" refusal below cannot be explained by the
    // group not being his: the list gate answers first.
    const bensGroup = await createGroup(ben);

    for (const [what, response] of [
      [
        'add an idea',
        ben.api.post(`/api/lists/${listId}/gifts`, {
          data: { title: 'Nicht erlaubt' },
        }),
      ],
      ['delete an idea', ben.api.delete(`/api/lists/${listId}/gifts/${giftId}`)],
      [
        'rename the list',
        ben.api.patch(`/api/lists/${listId}`, { data: { name: 'X' } }),
      ],
      [
        'change visibility',
        ben.api.patch(`/api/lists/${listId}`, { data: { visibility: 'PRIVATE' } }),
      ],
      [
        'grant a person',
        ben.api.post(`/api/lists/${listId}/access`, { data: { email: MIA } }),
      ],
      [
        'grant a group',
        ben.api.post(`/api/lists/${listId}/access`, {
          data: { groupId: bensGroup.id },
        }),
      ],
      [
        'revoke a group grant',
        ben.api.delete(`/api/lists/${listId}/group-access/${groupAccessId}`),
      ],
      ['delete the list', ben.api.delete(`/api/lists/${listId}`)],
    ] as [string, Promise<APIResponse>][]) {
      await expectRefusal(
        await response,
        403,
        'forbidden',
        `a group member must not be able to ${what}`
      );
    }

    /*
      What he may do is not nothing. Marking is the one capability an invited account
      has, and a group member gets it too - a group that reached somebody who then
      cannot coordinate is a share that buys nothing, which is the whole reason a group
      is a grant rather than a read-only list of names.
    */
    const marked = await ben.api.post(
      `/api/lists/${listId}/gifts/${giftId}/toggle`
    );
    expect(marked.status(), 'a group member may mark an idea bought').toBe(200);
    expect((await marked.json()).gift.isPurchased).toBe(true);

    // And may read the sheet it is marked on - the sheet is where the ideas are, and
    // there is no separate read for them: `GET /api/lists/{id}/gifts` does not exist,
    // which is the request `sharing.spec.ts` records a draft of itself making and then
    // asserting `>= 400` against.
    const benSheet = await ben.api.get(`/api/lists/${listId}`);
    expect(benSheet.status()).toBe(200);
    expect((await benSheet.json()).gifts[0].isPurchased).toBe(true);

    /*
      The grant is still standing after eight refusals, which is what makes them
      refusals rather than lucky ordering. Read as the owner, because the owner is who is
      shown an audience at all.
    */
    const survivors = await sheet(anna, listId);
    expect(survivors.groupAccess).toHaveLength(1);
    expect(survivors.gifts.map((g: { id: string }) => g.id)).toContain(giftId);

    /*
      And the one refusal here that needs a row to be real: withdrawing an *individual*
      grant, on an audience row that exists. The eight above could all be answered by a
      row that was never there; this one cannot, and it is refused by the same gate.
      `sharing.spec.ts` asserts the same row for a plainly invited buyer, so this is
      the group half of it.
    */
    const person = await grantPerson(anna, listId, BEN);
    expect(person.status()).toBe(200);
    await expectRefusal(
      await ben.api.delete(
        `/api/lists/${listId}/access/${(await person.json()).access.id}`
      ),
      403,
      'forbidden',
      'a member must not be able to withdraw an audience row that exists'
    );

    await anna.context.close();
    await ben.context.close();
  });

  test('a group that is not on this list is invisible, not forbidden', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, 'SHARED');
    await addGift(anna, listId, 'Geheimgeschenk');

    // Ben is in a real group of Anna's. It is simply not this one, which is the case
    // worth testing: an account with a group of its own somewhere in the product still
    // has no relationship to a list no group of his has been given.
    const benElsewhere = await createGroup(anna);
    await addMember(anna, benElsewhere.id, await findAccountId(anna, 'ben'));
    const miaOnThisList = await createGroup(anna);
    await addMember(anna, miaOnThisList.id, await findAccountId(anna, 'mia'));
    expect((await grantGroup(anna, listId, miaOnThisList.id)).status()).toBe(200);

    for (const [what, response] of [
      ['read it', ben.api.get(`/api/lists/${listId}`)],
      [
        'add an idea',
        ben.api.post(`/api/lists/${listId}/gifts`, { data: { title: 'x' } }),
      ],
      ['delete an idea', ben.api.delete(`/api/lists/${listId}/gifts/whatever`)],
      [
        'rename it',
        ben.api.patch(`/api/lists/${listId}`, { data: { name: 'X' } }),
      ],
      [
        'change visibility',
        ben.api.patch(`/api/lists/${listId}`, { data: { visibility: 'PRIVATE' } }),
      ],
      [
        'grant a person',
        ben.api.post(`/api/lists/${listId}/access`, { data: { email: MIA } }),
      ],
      [
        'grant a group',
        ben.api.post(`/api/lists/${listId}/access`, {
          data: { groupId: benElsewhere.id },
        }),
      ],
      ['delete it', ben.api.delete(`/api/lists/${listId}`)],
    ] as [string, Promise<APIResponse>][]) {
      await expectRefusal(
        await response,
        404,
        'not_found',
        `Ben, in a group that is not on this list, must not be able to ${what}`
      );
    }

    // And the refusal does not echo the list. A 404 whose body carried the sheet would
    // pass every status above.
    const refused = await ben.api.get(`/api/lists/${listId}`);
    expect(refused.status()).toBe(404);
    expect(await refused.text()).not.toContain('Geheimgeschenk');

    await anna.context.close();
    await ben.context.close();
  });

  test('a private list cannot be shared with a group', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);

    const listId = await createList(anna, 'PRIVATE');
    const group = await createGroup(anna);
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));

    await expectRefusal(
      await grantGroup(anna, listId, group.id),
      400,
      'not_shared_yet',
      'a private list has no audience to add a group to'
    );

    /*
      And the visibility is answered before the group is even looked at, which is a claim
      about ordering rather than about either refusal: there is no answer here that
      depends on whether the group exists, so a group id that names nothing must not
      turn into `no_such_group` on a private list. If that order were reversed this
      would be an oracle for which group ids are real, on a list the caller can already
      see.
    */
    await expectRefusal(
      await grantGroup(anna, listId, 'no-such-group'),
      400,
      'not_shared_yet',
      'a private list is refused before the group is looked at'
    );

    expect((await sheet(anna, listId)).groupAccess).toHaveLength(0);

    await anna.context.close();
  });

  test('a group owned by somebody else cannot be granted', async ({ browser }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const bensGroup = await createGroup(ben);
    const listId = await createList(anna, 'SHARED');

    await expectRefusal(
      await grantGroup(anna, listId, bensGroup.id),
      404,
      'no_such_group',
      "a group that is not the caller's is not the caller's to share"
    );

    // The audience says it plainly, so the refusal cannot have half-succeeded.
    expect((await sheet(anna, listId)).groupAccess).toHaveLength(0);

    /*
      And the same grant from the other side, which is refused for a different reason and
      says so: Ben owns the group, so nothing about the group is hidden from him - the
      list is. `no_such_group` would be the wrong sentence here, and it is asserted
      separately because the two are the only way to tell "not yours" from "not yours at
      all".
    */
    await expectRefusal(
      await grantGroup(ben, listId, bensGroup.id),
      404,
      'not_found',
      "Ben's own group does not get him a list he cannot read"
    );

    await anna.context.close();
    await ben.context.close();
  });

  test('one request names a person or a group, never both, never neither', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const listId = await createList(anna, 'SHARED');
    const group = await createGroup(anna);

    await expectRefusal(
      await anna.api.post(`/api/lists/${listId}/access`, { data: {} }),
      400,
      'nothing_to_change',
      'a body that names no grant asks about nothing'
    );
    await expectRefusal(
      await anna.api.post(`/api/lists/${listId}/access`, {
        data: { email: BEN, groupId: group.id },
      }),
      400,
      'ambiguous_change',
      'a body naming both is ambiguous rather than twice wrong'
    );

    // Neither wrote anything, and Ben has no relationship to this list, so any grant
    // that had landed would be visible in one of the two arrays.
    const after = await sheet(anna, listId);
    expect(after.access).toHaveLength(0);
    expect(after.groupAccess).toHaveLength(0);

    await anna.context.close();
  });

  test('a second grant of one group is refused, and a private list first', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, 'SHARED');
    const group = await createGroup(anna);
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));

    expect((await grantGroup(anna, listId, group.id)).status()).toBe(200);
    await expectRefusal(
      await grantGroup(anna, listId, group.id),
      400,
      'already_shared',
      'the same group twice is one grant'
    );

    /*
      Paused, and the identical request is now refused for a different reason. The
      visibility gate runs ahead of the duplicate check, so `not_shared_yet` is the
      answer while the list is private - which is the right way round: "make the list
      shared before sharing it" is actionable and "you already did" is not, and the grant
      is still there underneath.
    */
    await setVisibility(anna, listId, 'PRIVATE');
    await expectRefusal(
      await grantGroup(anna, listId, group.id),
      400,
      'not_shared_yet',
      'the visibility is answered before the duplicate'
    );

    // Which also means the pause did not withdraw it: re-sharing restores the same
    // audience to the same group, with nobody being asked twice.
    await setVisibility(anna, listId, 'SHARED');
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(200);
    expect((await sheet(anna, listId)).groupAccess).toHaveLength(1);
    await expectRefusal(
      await grantGroup(anna, listId, group.id),
      400,
      'already_shared',
      'the grant survived the pause, so it is still a duplicate'
    );

    await anna.context.close();
    await ben.context.close();
  });

  test('a group grant can be withdrawn while the list is private', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, 'SHARED');
    const group = await createGroup(anna);
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));
    const granted = await grantGroup(anna, listId, group.id);
    expect(granted.status()).toBe(200);
    const grantId = (await granted.json()).groupAccess.id;

    await setVisibility(anna, listId, 'PRIVATE');

    // Withdrawing is the one action on an audience that can only reduce what somebody
    // else can reach, so there is no state in which refusing it would be right -
    // including for a list its owner has just made private and now wants to clean up.
    const revoked = await anna.api.delete(
      `/api/lists/${listId}/group-access/${grantId}`
    );
    expect(revoked.status()).toBe(200);
    expect((await sheet(anna, listId)).groupAccess).toHaveLength(0);

    // The grant row is looked up with its list, so the same id through this list is now
    // simply not there - and `not_found` rather than `no_such_group`, because the gate
    // has already established the list is the caller's.
    await expectRefusal(
      await anna.api.delete(`/api/lists/${listId}/group-access/${grantId}`),
      404,
      'not_found',
      'a grant row is only a row on the list it was written for'
    );

    await anna.context.close();
    await ben.context.close();
  });

  /*
    THE FIRST OF THE TWO CASES THAT A SNAPSHOT IMPLEMENTATION FAILS.

    `prisma/schema.prisma` on `ListGroupAccess` rejects writing a `ListAccess` row per
    member at grant time: removal would then have to delete rows, and it would still
    need a backfill to reach anybody added afterwards. Both halves are asserted here, in
    order, and the last assertion is the load-bearing one - without it, "Ben can still
    read it" would be satisfied by both grants standing, and a snapshot would pass.
  */
  test('an account granted twice keeps its own grant when it leaves', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);

    const listId = await createList(anna, 'SHARED');
    const group = await createGroup(anna);
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));

    expect((await grantGroup(anna, listId, group.id)).status()).toBe(200);
    const person = await grantPerson(anna, listId, BEN);
    expect(person.status()).toBe(200);
    const accessId = (await person.json()).access.id;

    // Both paths visible side by side, which is how the owner tells adding a person from
    // adding everybody they keep together anyway.
    const before = await sheet(anna, listId);
    expect(before.access).toHaveLength(1);
    expect(before.groupAccess).toHaveLength(1);
    expect(before.list.sharedWithCount).toBe(1);
    expect(before.list.sharedWithGroupCount).toBe(1);
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(200);

    const [membership] = await membersOf(anna, group.id);
    expect(
      (await anna.api.delete(`/api/groups/${group.id}/members/${membership.id}`))
        .status()
    ).toBe(200);
    expect(await membersOf(anna, group.id)).toHaveLength(0);

    // Leaving the group takes the group grant. `readableBy` is an `OR` and the
    // individual row is still there, so the grant he was given in his own right is not
    // the group's to withdraw - which is the claim that gets forgotten by an
    // implementation that stores the audience.
    expect(
      (await ben.api.get(`/api/lists/${listId}`)).status(),
      'his own grant is not the group to revoke'
    ).toBe(200);
    expect(
      (await sheet(anna, listId)).groupAccess,
      'the group grant is untouched'
    ).toHaveLength(1);

    /*
      And now the half that cannot pass by accident: with the individual grant withdrawn
      as well, there is nothing left to reach the list by, so the group grant really is
      gone. If removal had left a per-member row behind, this read would be a 200.
    */
    expect(
      (await anna.api.delete(`/api/lists/${listId}/access/${accessId}`)).status()
    ).toBe(200);
    expect(
      (await ben.api.get(`/api/lists/${listId}`)).status(),
      'the group grant went when he left, not a row he cannot see'
    ).toBe(404);
    expect((await sheet(anna, listId)).access).toHaveLength(0);

    await anna.context.close();
    await ben.context.close();
  });

  /*
    THE SECOND OF THE TWO. A snapshot cannot pass this one at all: it would have written
    the audience at grant time, and a membership created afterwards reaches nothing.
    The first assertion is the control - the same grant, the same list, an empty group
    reaching nobody - so the 200 below is a change in the group's membership and not in
    anything else about the request.
  */
  test('an account added after the grant reaches the list at once', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const mia = await signIn(browser, MIA);

    const listId = await createList(anna, 'SHARED');
    await addGift(anna, listId, 'Kaffeemühle');
    const group = await createGroup(anna);

    expect((await grantGroup(anna, listId, group.id)).status(), 'a group of nobody')
      .toBe(200);
    expect(await membersOf(anna, group.id)).toHaveLength(0);
    expect(
      (await sheet(anna, listId)).groupAccess[0].memberCount,
      'and the audience says the group is empty'
    ).toBe(0);
    expect(
      (await mia.api.get(`/api/lists/${listId}`)).status(),
      'an empty group reaches nobody'
    ).toBe(404);

    await addMember(anna, group.id, await findAccountId(anna, 'mia'));

    const read = await mia.api.get(`/api/lists/${listId}`);
    expect(
      read.status(),
      'a member added after the grant reads it immediately, with no re-share'
    ).toBe(200);
    expect(JSON.stringify(await read.json())).toContain('Kaffeemühle');

    /*
      And nothing was backfilled. The person array stays empty because reach is derived
      on every read by walking the grant to the membership, so there is no second copy of
      the audience to keep in step with the first - and this assertion is what a snapshot
      would break, by filling the array with the member it had to guess at grant time.
    */
    const after = await sheet(anna, listId);
    expect(
      after.access,
      'the grant must not have written a row per member'
    ).toHaveLength(0);
    expect(after.groupAccess).toHaveLength(1);
    expect(after.groupAccess[0].memberCount).toBe(1);

    await anna.context.close();
    await mia.context.close();
  });

  test('deleting a group takes its grants and its memberships with it', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);
    const ben = await signIn(browser, BEN);
    const mia = await signIn(browser, MIA);

    const listId = await createList(anna, 'SHARED');
    await addGift(anna, listId, 'Etwas');
    const name = names.next();
    const group = await createGroup(anna, name);
    // Both of them in the group, and Mia additionally in her own right, so that
    // "deleting a group took its reach" and "deleting a group took nothing else" are two
    // separate claims with two separate pieces of evidence.
    await addMember(anna, group.id, await findAccountId(anna, 'ben'));
    await addMember(anna, group.id, await findAccountId(anna, 'mia'));
    expect((await grantGroup(anna, listId, group.id)).status()).toBe(200);
    expect((await grantPerson(anna, listId, MIA)).status()).toBe(200);
    expect((await ben.api.get(`/api/lists/${listId}`)).status()).toBe(200);

    expect((await anna.api.delete(`/api/groups/${group.id}`)).status()).toBe(200);

    // The grants are gone, and the endpoint that is authoritative for the audience says
    // so rather than this test inspecting a table.
    expect((await sheet(anna, listId)).groupAccess).toHaveLength(0);
    expect(
      (await ben.api.get(`/api/lists/${listId}`)).status(),
      'the group reached him and nothing else did'
    ).toBe(404);
    await expectRefusal(
      await anna.api.get(`/api/groups/${group.id}`),
      404,
      'no_such_group',
      'the group is gone'
    );

    /*
      The memberships are gone too, and the proof is the same product claim the
      confirmation makes: a group re-created under the same name arrives empty. The name
      is free again because uniqueness is on the row and the row is gone - which is also
      why the cascade cannot be a tombstone and this deletion is irreversible.
    */
    const again = await createGroup(anna, name);
    expect(
      await membersOf(anna, again.id),
      'the memberships went with the group'
    ).toHaveLength(0);

    // And what each person was granted in their own right survives, because the members
    // and their lists are not what the cascade removes.
    expect(
      (await mia.api.get(`/api/lists/${listId}`)).status(),
      'her own grant is not the group'
    ).toBe(200);
    expect((await sheet(anna, listId)).access).toHaveLength(1);

    await anna.context.close();
    await ben.context.close();
    await mia.context.close();
  });
});

test.describe('Looking somebody up to put in a group', () => {
  test('a search finds an account by handle or address, in any case', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const found = await (await anna.api.get('/api/accounts/search?q=ben')).json();
    const byHandle = found.results;
    expect(byHandle, 'a prefix of the handle finds it').toHaveLength(1);
    expect(byHandle[0].nickname).toBe('ben');
    expect(byHandle[0].email).toBe(BEN);
    /*
      One row for a query that hits both of its columns: `ben` and
      `ben@example.test` both start with it, and an account must not appear twice. And the
      answer to "which one" is the handle - the field a person thinks of as the handle,
      and what lets them pick between two similar ones without comparing addresses by eye.
    */
    expect(byHandle[0].matched).toBe('nickname');

    // The caller is not in their own results, which is the sharpest version of the rule:
    // the query that would match somebody is the caller, so the answer is nobody at all -
    // and "you are not somebody you are looking for" has to be true even when it costs
    // the one result the query was obviously aiming at.
    expect(
      (await (await anna.api.get('/api/accounts/search?q=anna')).json()).results,
      'a caller must not find themselves'
    ).toEqual([]);

    const byAddress = (
      await (await anna.api.get('/api/accounts/search?q=ben@ex')).json()
    ).results;
    expect(byAddress).toHaveLength(1);
    expect(byAddress[0].nickname).toBe('ben');
    expect(byAddress[0].matched, 'this one matched the address').toBe('email');

    // Both columns are stored lowercased, so a prefix match on them can be too - and a
    // capitalised attempt is what a phone keyboard supplies, not an edge case.
    for (const query of ['ben', 'Ben', 'BEN']) {
      const rows = (
        await (await anna.api.get(`/api/accounts/search?q=${query}`)).json()
      ).results;
      expect(rows, `"${query}" must find the same account`).toHaveLength(1);
      expect(rows[0].nickname).toBe('ben');
    }

    await anna.context.close();
  });

  test('the answer is four columns, one derived value, and no count', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    const response = await anna.api.get('/api/accounts/search?q=ben');
    expect(response.status()).toBe(200);
    const body = await response.json();

    /*
      The body is the results and nothing else, asserted as the key set rather than as
      the absence of a number somebody remembered to check. "no total, ever" is one of
      the rules in `lib/account-search.ts`: a full page of results already says more may
      exist and a number does not, and a count is what turns a lookup into an instrument
      the eight-row cap cannot bound. The key set is the whole assertion - a `total` or
      a `count` would be a second key here.
    */
    expect(Object.keys(body)).toEqual(['results']);

    /*
      And no column nobody decided to send. `password` and `createdAt` are the two on the
      stored row that are deliberately absent, and this is the one endpoint where an
      account row is turned into a response. Asserted as the exact field set, which also
      pins the one value no column holds - `matched`, which only the caller knows - so a
      column added later cannot ride out under a name nobody looked for.
    */
    expect(Object.keys(body.results[0]).sort()).toEqual([
      'displayName',
      'email',
      'id',
      'matched',
      'nickname',
    ]);

    const raw = JSON.stringify(body);
    expect(raw).not.toContain('password');
    expect(raw).not.toContain('createdAt');

    await anna.context.close();
  });

  test('two characters are not a lookup, and a missing one is not either', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    for (const query of ['b', 'be']) {
      const body = await expectRefusal(
        await anna.api.get(`/api/accounts/search?q=${query}`),
        400,
        'invalid_search_query',
        `"${query}" is below the floor and must run no query at all`
      );
      expect(
        body.results,
        'and it must disclose nothing about matches'
      ).toBeUndefined();
    }

    // Absent is not an empty string. The route passes the parameter through as it is -
    // `null` when it is missing - because a copy of the three-to-sixty-four rule here
    // would be a second place to keep it.
    await expectRefusal(
      await anna.api.get('/api/accounts/search'),
      400,
      'invalid_search_query',
      'no query at all is not a lookup'
    );

    // And the ceiling, because a query that cannot be short can still be absurd.
    await expectRefusal(
      await anna.api.get(`/api/accounts/search?q=${'b'.repeat(65)}`),
      400,
      'invalid_search_query',
      'a query longer than any handle is refused rather than matched'
    );

    await anna.context.close();
  });

  test('an account may look somebody up only once it has a list to share', async ({
    browser,
  }) => {
    const mia = await signIn(browser, MIA);

    /*
      Mia owns no list in the seed, and that is the whole basis of this case: the
      capability is scoped to "when sharing a wishlist", so the cheapest account to
      create is one with no lists and it must not be able to enumerate anybody. She is a
      real signed-in account - the refusal is about her lists, not about her session.
    */
    await expectRefusal(
      await mia.api.get('/api/accounts/search?q=ben'),
      404,
      'not_found',
      'an account with no list has nothing to share and no reason to look anybody up'
    );

    // The rule is about having something to share rather than about being a new account,
    // so the same account is allowed the moment it owns a list...
    const own = await createList(mia, 'PRIVATE');
    const allowed = await mia.api.get('/api/accounts/search?q=ben');
    expect(allowed.status(), 'owning one list is the whole difference').toBe(200);

    // ...and refused again once it owns none. The list is handed back inside this test
    // rather than in the teardown, so the state this case depends on is restored before
    // anything that runs after it can observe it.
    expect((await mia.api.delete(`/api/lists/${own}`)).status()).toBe(200);
    await expectRefusal(
      await mia.api.get('/api/accounts/search?q=ben'),
      404,
      'not_found',
      'no list again, so no lookup again'
    );

    await mia.context.close();
  });

  /*
    The escaping in `lib/account-search.ts`, asserted from outside, because it is the one
    piece of that module with no other reason to exist and nothing else would notice its
    removal.

    Prisma builds `startsWith` into plain `LIKE` interpolation and escapes nothing, and
    a Prisma maintainer states on prisma/prisma#19506 that this is intended. Both columns
    admit the metacharacters: `NICKNAME_REGEX` permits `_`, and `EMAIL_REGEX` is a
    negated class over `@`, `.` and whitespace, so `%` passes in the local part. Since the
    query is a *prefix*, `_` would match every nickname and every address in the database
    - the entire account table, from a signed-in account that owns one list. Each of the
    four below is at least three characters, so each passes the length floor and reaches the
    query; without the manual escaping each of them matches somebody.
  */
  test('a query of nothing but LIKE metacharacters returns nobody', async ({
    browser,
  }) => {
    const anna = await signIn(browser, ANNA);

    // The control, so an empty result below is a real answer and not an endpoint that
    // finds nobody for any query.
    const control = await (await anna.api.get('/api/accounts/search?q=ben')).json();
    expect(control.results).toHaveLength(1);

    for (const query of [
      '___', // three wildcards: unescaped, every handle in the table
      '%%%', // the same for the address column
      'b_n', // one wildcard in the middle: unescaped, this is `ben`
      '%be', // a leading wildcard: unescaped, this is every address containing "be"
    ]) {
      const response = await anna.api.get(
        `/api/accounts/search?q=${encodeURIComponent(query)}`
      );
      expect(response.status(), `"${query}" is long enough to reach the database`)
        .toBe(200);
      expect(
        (await response.json()).results,
        `"${query}" returned the account table instead of nobody`
      ).toEqual([]);
    }

    /*
      The one direction this file does not pin is over-escaping - a query that has its
      `_` and `%` stripped rather than escaped, which would break a real handle like
      `b_en` and match nothing for it. Proving the escaping leaves a literal underscore
      working needs an account with one, which means registering a fourth account into a
      seed that ships three on purpose; the direction the code defends against is the one
      above, and it is the one that hands out the table.
    */

    await anna.context.close();
  });

  test('nobody without a session reaches the lookup', async ({ browser }) => {
    const anonymous = await browser.newContext();

    const response = await anonymous.request.get('/api/accounts/search?q=ben');
    expect(
      response.status(),
      'there is no anonymous way to learn who exists'
    ).toBe(401);

    /*
      This is the one refusal in the product with no `code` beside it, and the absence is
      the assertion rather than an oversight: the closed vocabulary has nothing for "you
      are not signed in", so the route answers a plain 401 before it reads the query.
      Which is also why the *query* is not examined first - a route that answered
      `invalid_search_query` here would have told an unauthenticated caller a rule about
      itself before it had refused it. So there is no code to pin, and what is pinned
      instead is that nothing was searched: no results, and no `results` key to hold them.
    */
    const body = await response.json();
    expect(body.results).toBeUndefined();
    expect(body.code).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('ben');

    await anonymous.close();
  });
});
