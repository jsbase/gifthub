import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { Outcome } from '@/lib/list-access';
import type { Refusal } from '@/lib/refusals';

/**
 * Every group-scoped read and write in the product.
 *
 * A group is a named set of accounts one owner shares with in a single
 * act, and this module owns the rows behind it: the group, its name,
 * its membership. It is a separate file from `lib/list-access.ts`
 * because a group is not a list and that module documents itself as
 * "every list-scoped read and write in the product". Widening that
 * claim to cover "and who am I in" would blur the one file this repo
 * treats as the security model. Design spec 4.4 records the decision;
 * this banner is what the decision costs.
 *
 * What the module does *not* do is decide whether a group may read a
 * list. That is `readableBy` (`lib/list-access.ts:90`), whose group
 * disjunct walks a `ListGroupAccess` row to a `GroupMember` row and
 * asks whether this account is in it. This module writes those rows
 * and never joins them to answer an authorization question of its own,
 * and that division is what makes removal mean something: a membership
 * deleted here changes the answer on the next read, because no stored
 * audience exists to go stale. `schema.prisma` on `ListGroupAccess`
 * rejects the snapshot alternative, and the argument it gives there is
 * the argument for keeping this module out of the read predicate.
 *
 *   capability                            owner    anybody else
 *   ---------------------------------------------------------------------------
 *   read the groups this account owns     yes      404 no_such_group
 *   read one group's members              yes      404 no_such_group
 *   create a group                        yes      -  (caller is the owner)
 *   rename or delete a group              yes      404 no_such_group
 *   add or remove a member                yes      404 no_such_group
 *
 * Three rules hold across that table and none of them is a style
 * preference.
 *
 * 1. Every group lookup is `findFirst({ where: { id, ownerId } })`.
 *    Never `findUnique({ where: { id } })`. The repo has already
 *    shipped the other shape: `app/api/members/[id]/route.ts` looked a
 *    membership row up by id alone, a correctly-scoped delete then
 *    refused to reach across to it, and the delete threw into a 500
 *    that every other handler answered with 404 - an existence oracle
 *    across groups, produced by two queries that each looked right in
 *    isolation. `lib/list-access.ts:11-15` cites that incident as the
 *    reason the whole authorization surface was consolidated into one
 *    module, and it is why `ownedGroup` below is the only way to reach
 *    a `Group` row.
 *
 * 2. A group that is not this owner's is `no_such_group`. Not
 *    `forbidden`, and not `not_found`: `no_such_group` is a 404
 *    (`lib/api-refusal.ts:51-57`) and its comment already records that
 *    the refusal is aimed at the owner, so the answer is the same shape
 *    whether the group belongs to somebody else or does not exist at
 *    all. `forbidden` would assert something false - "you can see this
 *    and may not touch it" - about a group the caller has no
 *    relationship to.
 *
 * 3. Membership is not browsable. `groupsForAccount` returns the
 *    groups an account owns, and there is deliberately no function
 *    returning the groups an account is *in*. `Account.groupMemberships`
 *    (`schema.prisma:98-103`) exists to answer "which groups reach this
 *    list" and is never shown to a member, because whose group somebody
 *    is in is the owner's business. A member learns they have reached a
 *    list by opening it.
 *
 * There is no repository port here either, for the reason
 * `lib/list-access.ts:53-55` gives: Prisma is the only implementation,
 * and a seam with one adapter is indirection rather than a seam.
 */

/**
 * `Outcome` is imported rather than restated so that a route narrowing a
 * group outcome and a route narrowing a list outcome narrow the same
 * union, over the same closed `Refusal` vocabulary. `done` and
 * `refused` are restated because they are private to
 * `lib/list-access.ts`, and two one-line constructors are not worth
 * widening that module's surface for - the alternative, a shared
 * `lib/outcome.ts`, is a module that would exist to hold two lines.
 */
const done = <T>(value: T): Outcome<T> => ({ ok: true, value });
const refused = <T>(refusal: Refusal): Outcome<T> => ({ ok: false, refusal });

/**
 * A group with the size of its audience.
 *
 * `memberCount` rides along in the same query rather than arriving as
 * a second request, for the reason `readableListSummary` gives its
 * owner name and audience count: two queries means a window in which
 * the dialog claims a group holds four people and the list underneath
 * it holds five.
 */
export interface StoredGroup {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
}

/**
 * One account inside one group, as its owner sees it.
 *
 * The account's columns are flattened in rather than nested, which is
 * what `StoredAccessRow` does, for the reason `lib/wire.ts` spells
 * out: every field is named, so a column added to the schema cannot
 * reach the client without somebody deciding to.
 *
 * `accountId` is not nullable, where `StoredAccessRow`'s is, and the
 * difference is the schema's: `GroupMember.account` is `onDelete:
 * Cascade` (`schema.prisma:206-207`), so there is no state in which a
 * membership is readable and the account it names is gone. The comment
 * on that cascade gives the reason it is not `SetNull` - a membership
 * outliving its account reaches nobody while still counting as a
 * member - and it is why the account's columns can be joined in here.
 */
export interface StoredGroupMember {
  id: string;
  groupId: string;
  accountId: string;
  nickname: string;
  displayName: string;
  email: string;
  addedAt: Date;
}

type StoredGroupWithCount = Prisma.GroupGetPayload<{
  include: {
    _count: { select: { members: true } };
  };
}>;

type StoredMemberWithAccount = Prisma.GroupMemberGetPayload<{
  include: {
    account: {
      select: { id: true; email: true; displayName: true; nickname: true };
    };
  };
}>;

const groupInclude = {
  _count: { select: { members: true } },
} satisfies Prisma.GroupInclude;

const memberInclude = {
  account: {
    select: { id: true, email: true, displayName: true, nickname: true },
  },
} satisfies Prisma.GroupMemberInclude;

const toStoredGroup = (group: StoredGroupWithCount): StoredGroup => ({
  id: group.id,
  name: group.name,
  ownerId: group.ownerId,
  memberCount: group._count.members,
  createdAt: group.createdAt,
});

const toStoredMember = (row: StoredMemberWithAccount): StoredGroupMember => ({
  id: row.id,
  groupId: row.groupId,
  accountId: row.accountId,
  nickname: row.account.nickname,
  displayName: row.account.displayName,
  email: row.account.email,
  addedAt: row.addedAt,
});

/**
 * Whether this error is the unique index on one column, read off
 * `meta.target`.
 *
 * `P2002` alone does not say which constraint was violated, and the
 * difference is the one `lib/nickname.ts:86-91` exists to make: this
 * table has the primary key and `@@unique([ownerId, name])`, and
 * answering "you already have a group with that name" for a violation
 * of the other one is a sentence about the wrong field, which is the
 * failure `register/route.ts:209-215` cites while doing the same
 * discrimination in its own catch.
 *
 * Tested on `code` and never on `message`. The message is a rendered
 * sentence Prisma composes for a human reading a terminal; matching on
 * it means this stops firing the day the wording changes, and the
 * symptom is a 500 on an operation that has a correct answer ready for
 * it (`register/route.ts:203-207`).
 *
 * `meta.target` is a list of columns on some Prisma versions and a
 * single constraint name on others, so both are read - and the test is
 * `includes`, not equality, because both shapes of the answer contain
 * the column being asked about: `Group_ownerId_name_key`,
 * `GroupMember_groupId_accountId_key`, or the column list itself.
 * Anything unrecognised is reported as not-a-violation, so the caller
 * rethrows rather than guesses, which is the choice
 * `register/route.ts:216-221` makes.
 */
const uniqueViolationOn = (error: unknown, column: string): boolean => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target
    : typeof target === 'string'
      ? [target]
      : [];

  return fields.some((field) => String(field).includes(column));
};

/**
 * The gate every group capability goes through.
 *
 * One function rather than a predicate written out five times, because
 * `lib/list-access.ts:167-169` records what happens when one predicate
 * has copies: the copy that lost the `visibility` term looked right,
 * and the bug it produced was silent. Here the term cannot be lost,
 * because the only way to reach a `Group` row from this module is
 * through this query.
 *
 * Private, unlike `requireWritableList`. Every route's need for a group
 * is a need to *do* something to it, and each of those is a function
 * below that has already gated; a route reaching for the raw gate would
 * be a route assembling its own authorization, which is the thing both
 * modules exist to prevent.
 */
const ownedGroup = async (
  groupId: string,
  ownerId: string
): Promise<Outcome<StoredGroupWithCount>> => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, ownerId },
    include: groupInclude,
  });
  return group ? done(group) : refused('no_such_group');
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * The groups this account owns, newest first.
 *
 * Owned groups only, which is the third rule of the header rather than
 * an omission: there is no "the groups I am in", because membership is
 * not something a person browses.
 *
 * Not an `Outcome`. Nothing here can be refused - the account came
 * from the session and owns whatever it owns - so the empty array is a
 * real answer for a new account rather than a failure to report.
 * `listSummariesFor` returns its two halves the same way, for the same
 * reason.
 *
 * Newest first because the contents page already taught that ordering
 * to these accounts (`listSummariesFor`, `list-access.ts:178`), and a
 * second list running the other way would read as a different kind of
 * thing.
 */
export const groupsForAccount = async (
  accountId: string
): Promise<StoredGroup[]> => {
  const groups = await prisma.group.findMany({
    where: { ownerId: accountId },
    include: groupInclude,
    orderBy: { createdAt: 'desc' },
  });

  return groups.map(toStoredGroup);
};

/**
 * The people in this group, in the order the owner put them there.
 *
 * `addedAt` ascending, as `accessForList` orders its audience
 * (`list-access.ts:284`). This list is a record of what the owner
 * decided and when, and alphabetical order would answer a question
 * nobody asked - "how many Bens are in here" - at the cost of the one
 * they did.
 *
 * Owner only, which is the one place membership is read at all, and
 * reading it is not the same as showing it: the answer goes to the group
 * owner and to nobody else.
 */
export const membersOfGroup = async (
  groupId: string,
  ownerId: string
): Promise<Outcome<StoredGroupMember[]>> => {
  const gate = await ownedGroup(groupId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  const rows = await prisma.groupMember.findMany({
    where: { groupId },
    include: memberInclude,
    orderBy: { addedAt: 'asc' },
  });

  return done(rows.map(toStoredMember));
};

// ---------------------------------------------------------------------------
// Owning a group
// ---------------------------------------------------------------------------

/**
 * Create a group, owned by the account that made it.
 *
 * There is no authorization to do here, and that is why the parameter
 * is `accountId` and not an owner id the caller supplied: ownership
 * falls out of who is signed in, so a request cannot name somebody
 * else's group into existence. The session's account is the only thing
 * that crosses this seam from the caller.
 *
 * Uniqueness is the index's decision rather than this function's, for
 * the reason `lib/nickname.ts:16-20` gives at length and
 * `Account.nickname` repeats in the schema: a validator that checks "is
 * this taken" and a unique index that enforces it will disagree under
 * concurrency, and the constraint is the one that cannot be raced. So
 * `P2002` is caught and answered with `duplicate_group_name`.
 *
 * **There is no pre-check in front of the write**, which is the
 * decision worth stating because the checked-then-written shape is
 * what `grantAccess` does for an individual grant
 * (`lib/list-access.ts:389-392`) and it is the shape this deliberately
 * is not:
 *
 *   - it spends a round trip on every create to ask a question the
 *     index is about to answer anyway, and it produces the identical
 *     refusal either way - `duplicate_group_name`, a 400, "You already
 *     have a group with that name";
 *
 *   - in `renameGroup` it would additionally need an `id` exclusion,
 *     or renaming a group to the name it already has would be refused
 *     as a duplicate - which is a second place to get this answer
 *     wrong, about a case that is not a duplicate at all;
 *
 *   - and catching the violation is the arrangement this repo already
 *     uses for the same race: `register/route.ts:196-250` answers two
 *     lost uniqueness races from the error rather than avoiding it,
 *     including the discrimination on `meta.target`.
 *
 * The name arrives trimmed and known non-empty. That check belongs to
 * the route, exactly as for a list name (`app/api/lists/route.ts:85-94`),
 * so that the rule sits next to the field a person typed it into;
 * design spec 12 records group-name validation as the same open debt
 * `DESIGN.md` records for lists.
 */
export const createGroup = async (
  accountId: string,
  name: string
): Promise<Outcome<StoredGroup>> => {
  try {
    const group = await prisma.group.create({
      data: { name, ownerId: accountId },
      include: groupInclude,
    });
    return done(toStoredGroup(group));
  } catch (error) {
    if (!uniqueViolationOn(error, 'name')) throw error;
    return refused('duplicate_group_name');
  }
};

/**
 * Rename a group. Owner only.
 *
 * The gate runs before anything looks at the name, and the order is
 * the point: a stranger who does not own this group gets
 * `no_such_group` whether or not the name they chose is free, so the
 * refusals cannot be used to find out which names the owner has taken.
 * The caller's own duplicate is still answered, one step later.
 *
 * The same index decides uniqueness and the same catch answers it as in
 * `createGroup`, through the same helper, so the two cannot drift into
 * disagreeing about what a duplicate name is.
 *
 * The `update` is keyed by id alone, which is not the omission rule 1
 * of the header appears to state. Prisma has no update-and-assert
 * shape, the gate above has already established that this id is this
 * owner's row, and the read *is* the authorization. `renameList`
 * (`lib/list-access.ts:317`) is the same arrangement and predates this
 * module.
 */
export const renameGroup = async (
  groupId: string,
  ownerId: string,
  name: string
): Promise<Outcome<StoredGroup>> => {
  const gate = await ownedGroup(groupId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name },
      include: groupInclude,
    });
    return done(toStoredGroup(group));
  } catch (error) {
    if (!uniqueViolationOn(error, 'name')) throw error;
    return refused('duplicate_group_name');
  }
};

/**
 * Delete a group, its memberships and every list it was shared with.
 *
 * The cascade is the schema's - `GroupMember.group` and
 * `ListGroupAccess.group` are both `onDelete: Cascade`
 * (`schema.prisma:205` and `:241`) - and that is why the confirmation
 * states the consequence rather than asking whether the person is sure.
 * It is irreversible: nothing here is a second copy, there is no
 * tombstone, and a group re-created under the same name arrives empty,
 * so the reach it had cannot be reconstructed from anything this
 * product stores.
 *
 * What survives: the members, their accounts and their lists. Only the
 * rows that let one grant reach several people at once are removed,
 * which is why an account that was also granted a list individually
 * keeps reading it - `readableBy` is an `OR`.
 *
 * The `memberCount` in the answer is the count the gate read, not one
 * taken afterwards. The cascade has already run by the time anything
 * could re-read, so a fresh count would be zero - a number about a
 * group that no longer exists - and the count the caller actually needs
 * is the number of people who just lost reach. It is also the number
 * the confirmation was about to name.
 */
export const deleteGroup = async (
  groupId: string,
  ownerId: string
): Promise<Outcome<StoredGroup>> => {
  const gate = await ownedGroup(groupId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  await prisma.group.delete({ where: { id: gate.value.id } });
  return done(toStoredGroup(gate.value));
};

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/**
 * Put an account into a group. Owner only.
 *
 * The account has to exist already. Turning something a person typed -
 * a nickname, an address - into an account id is the caller's job and
 * the account search's, so this module takes the id it is handed: there
 * is no second way to be "not found" here and nowhere for a half-typed
 * address to be matched against a name it does not belong to.
 *
 * `cannot_join_own_group` for the owner, and neither `forbidden` nor
 * `cannot_share_with_owner`. `cannot_share_with_owner` means "this
 * grant is redundant - you already have this list", which is why it is
 * a 400: nothing is wrong, the request merely adds nothing. The owner
 * in their own group is not redundant and not a mistake to correct; it
 * is a shape the schema refuses to represent, and `Group`'s doc comment
 * keeps ownership and membership apart precisely so that an owner's id
 * cannot end up in the audience of the group they own. And `forbidden`
 * is refused because its sentence is about a list - "this list does not
 * grant that" - which would be read in a dialog that is not about a
 * list. `forbidden` is reachable only from a list for that reason; a
 * group operation that has to refuse a person who can already see the
 * group needs a code that can say what is actually wrong.
 */
export const addMember = async (
  groupId: string,
  ownerId: string,
  accountId: string
): Promise<Outcome<StoredGroupMember>> => {
  const gate = await ownedGroup(groupId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  /*
    An account's primary key is its identity, so this is the one lookup in
    the module that carries no owner scope, and it is no exception to rule 1:
    rule 1 is about rows that *belong* to somebody, and the only question
    asked of an account here is whether it exists. That answer is
    `no_such_account`, a 404, because existence is what it says.
  */
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return refused('no_such_account');
  if (account.id === ownerId) return refused('cannot_join_own_group');

  /*
    Already a member: the existing row comes back, and the reason is that the
    closed vocabulary has no code for this, and inventing one here would
    defeat the point of a closed vocabulary. `already_shared` is a list
    grant - "this list is already shared with them" - and design spec 5.1
    assigns it to a second share of one list with a group, not to a
    membership. `duplicate_group_name` is about names, and
    `nothing_to_change` is about a body that named neither or both of the
    two fields it may name. None of those is the sentence for "they are
    already in this group", and a refusal is a deliberate act in
    `lib/refusals.ts` that touches five places, not a decision this
    function gets to make.

    Returning the row is the honest answer because the requested state is
    now the actual state: the caller asked for this person to be in this
    group, and they are. The same reasoning answers the race below.
  */
  const existing = await prisma.groupMember.findFirst({
    where: { groupId, accountId },
    include: memberInclude,
  });
  if (existing) return done(toStoredMember(existing));

  try {
    const row = await prisma.groupMember.create({
      data: { groupId, accountId },
      include: memberInclude,
    });
    return done(toStoredMember(row));
  } catch (error) {
    /*
      Somebody added this person between the read and the write - the same
      few milliseconds of double tap `toggleGiftPurchased` is built around
      (`lib/list-access.ts:550-571`). There is no bought mark here to lose
      and no permission to get wrong; the only thing at stake is that the
      answer would be a 500 for a request whose outcome is now true. So
      the row that beat us is read back and returned, and the two paths
      are indistinguishable from outside.

      Scoped by `{ groupId, accountId }` like the read above, never by the
      membership id: a read-back that could find somebody else's row would
      turn a race recovery into the cross-group lookup rule 1 exists to
      prevent.
    */
    if (!uniqueViolationOn(error, 'accountId')) throw error;

    const raced = await prisma.groupMember.findFirst({
      where: { groupId, accountId },
      include: memberInclude,
    });
    if (!raced) throw error;
    return done(toStoredMember(raced));
  }
};

/**
 * Take one account out of a group. Owner only.
 *
 * This is the action that revokes. Every list shared with this group
 * stops answering for them on the next read and nothing else in the
 * product is touched: no list needs a row deleting, no reach needs
 * recomputing, no backfill needs running, because a group grant stores
 * no audience to begin with. `schema.prisma` on `ListGroupAccess`
 * rejects the snapshot design for precisely this reason - it forces
 * removal to *delete* rows and still cannot reach members added
 * afterwards without a backfill. Derived, there is nothing to keep in
 * step.
 *
 * It does not revoke what the person was granted in their own right.
 * `readableBy` is an `OR`, so a `ListAccess` row they hold survives
 * leaving the group, and that is the grant they were given rather than
 * a leak.
 *
 * The membership is looked up by `{ id, groupId }`. That pair is the
 * whole shape of this function and it is the query whose absence caused
 * the incident the header cites: with `{ id }` alone, a membership id
 * belonging to another group is found, fails the group check it is
 * supposed to be scoped by, and turns into either a deletion of
 * somebody else's row or - as it shipped - a throw.
 *
 * `not_found`, not `no_such_group`: the gate above has already
 * established that this group is the caller's, so there is nothing left
 * to conceal, and `no_such_group` would be claiming the group is not
 * theirs when it very much is. `revokeAccess`
 * (`lib/list-access.ts:418-442`) answers `not_found` for an audience
 * row that is not on the caller's list for exactly the same reason.
 */
export const removeMember = async (
  groupId: string,
  ownerId: string,
  memberId: string
): Promise<Outcome<StoredGroupMember>> => {
  const gate = await ownedGroup(groupId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  const row = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId },
    include: memberInclude,
  });
  if (!row) return refused('not_found');

  await prisma.groupMember.delete({ where: { id: row.id } });
  return done(toStoredMember(row));
};
