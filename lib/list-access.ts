import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { Refusal } from '@/lib/refusals';
import type { ListVisibility } from '@/types';

/**
 * Every list-scoped read and write in the product.
 *
 * This module is the whole authorization surface, and the table below is the whole
 * product's security model. It exists as one module for a reason that is written
 * down rather than assumed: the group-scoping rule this replaces had already
 * drifted once, when `app/api/members/[id]/route.ts` looked its row up by id alone
 * and the gift delete refused while the membership delete threw into a 500. A rule
 * that is re-typed in each handler is a rule that will be re-typed wrongly in one
 * of them.
 *
 *   capability                          owner   invited   in a group   anyone else
 *   --------------------------------------------------------------------------------
 *   read the list and its ideas           yes       yes        yes           404
 *   mark an OPEN idea bought             yes       yes        yes           404
 *   clear a mark they set                 yes       yes        yes           404
 *   clear a mark somebody else set        403       yes        yes           404
 *   add an idea                           yes       403        403           404
 *   delete an idea                        yes       403        403           404
 *   copy an idea to a list you own        yes       403        403           404
 *   move an idea to a list you own        yes       403        403           404
 *   rename the list                       yes       403        403           404
 *   change visibility                     yes       403        403           404
 *   grant access (needs SHARED)           yes       403        403           404
 *   revoke access                         yes       403        403           404
 *   revoke a group grant                  yes       403        403           404
 *   delete the list (cascades ideas)      yes       403        403           404
 *
 * Five things in that table are not obvious and each has a reason.
 *
 * 1. `404` and `403` are not interchangeable. An account with no relationship to a
 *    list is told there is nothing there, so another person's list is never
 *    confirmed to exist. `403` is only ever returned to somebody who can already
 *    read the list, for an action the visibility does not grant them. Leaking
 *    existence through a status code is a real disclosure, not a technicality.
 *
 * 2. An owner may set a mark on an open idea and may not clear anybody else's.
 *    Both halves are load-bearing. Without the first, "I already bought this
 *    myself" cannot be recorded. Without the second, the recipient - who is now
 *    the account that owns the list and therefore the person most likely to have
 *    changed their mind about a gift - could clear every mark and double-buying
 *    would be possible again, which is the one thing this product exists to
 *    prevent.
 *
* 3. An invited account may clear a mark somebody else set. The mark is shared by
 *    design, so a buyer correcting another buyer's mark is the coordination
 *    working: "Anna marked this but she is not getting it, Ben is." The asymmetry
 *    in 2 is aimed at the owner specifically, because the owner's reason for
 *    wanting a mark gone is the one that breaks the guarantee.
 *
 * 4. "In a group" is a third column rather than a fourth kind of person, because it
 *    is not one. A group member gets *exactly* the row an invited account gets, in
 *    both directions: they may read and may mark, and they may not add, rename,
 *    re-share or delete. The column exists to make the route each takes visible -
 *    reaching a list through `ListGroupAccess` rather than through `ListAccess` -
 *    and not to suggest a fourth tier of permission. There is no group-level
 *    permission in this product and no read-only group.
 *
 *    Nothing in the table distinguishes the two, and that is the design rather than
 *    an omission. The reach is *derived*: `readableBy` walks a `ListGroupAccess` row
 *    to a `GroupMember` row on every read, so a membership deleted from
 *    `lib/group-access.ts` changes the answer on the next read with no list-level
 *    row to delete and no stored audience to fall out of step. The snapshot
 *    alternative - writing a `ListAccess` per member at grant time - is rejected on
 *    the `ListGroupAccess` doc comment in `prisma/schema.prisma`, because removal
 *    would then have to delete rows and members added afterwards would need a
 *    backfill.
 *
 *    It also gets the awkward case right without being instructed to: an account
 *    holding both an individual grant and a group grant keeps its access when it
 *    leaves the group, because `readableBy` is an `OR` and the individual row is
 *    still there. `tests/groups.spec.ts` asserts that case directly, because a
 *    permission rule only one implementation knows about is a rule with one
 *    implementation.
 *
 * 5. The two transfer rows are gated *asymmetrically*, and the asymmetry is the
 *    whole of the rule. The source goes through `requireWritableList`, which is
 *    403 for somebody who can already read it; the destination goes through
 *    `findOwnedList`, which is 404 for anybody who does not own it. So naming
 *    somebody else's list as a destination is answered with "there is nothing here
 *    for you" rather than with "that list exists and is not yours" - the same
 *    disclosure rule as rule 1, applied to a second list in a single request. A
 *    destination the caller may merely *read* is refused too: being able to see a
 *    sheet is not a reason a wish may be written on it, and reusing
 *    `requireWritableList` there would have quietly granted the group-reach row
 *    above a capability its owners do not have.
 *
 * Note what is deliberately absent: there is no repository port here. Prisma is the
 * only implementation, and a seam with one adapter is indirection rather than a
 * seam.
 */

/** A gift as Prisma holds it. Dates are still `Date` at this seam. */
type StoredGift = Prisma.GiftGetPayload<Record<string, never>>;
type StoredList = Prisma.ListGetPayload<Record<string, never>>;
type StoredAccount = Prisma.AccountGetPayload<Record<string, never>>;

export type Outcome<T> = { ok: true; value: T } | { ok: false; refusal: Refusal };

const done = <T>(value: T): Outcome<T> => ({ ok: true, value });
const refused = <T>(refusal: Refusal): Outcome<T> => ({ ok: false, refusal });

/**
 * The read predicate, in one place.
 *
 * A list is readable by its owner, always - an owner reading their own list is not
 * gated on its visibility, or a `PRIVATE` list would be unreadable by the one person
 * who owns it - and by an account holding a `ListAccess` row **or sitting in a group
 * that holds a `ListGroupAccess` row** *only while the list is `SHARED`*.
 *
 * The visibility term is not decorative and was missing for a while, which is worth
 * recording because the omission was silent and the suite caught it. The reasoning
 * at the time was that `PRIVATE` is enforced by having no access rows, so a second
 * term would be redundant. It is not redundant, it is the only thing that works:
 * an access row outlives the visibility change on purpose, because going private is
 * meant to be a reversible pause rather than a revocation. So with no visibility term
 * in the predicate, an owner who set their shared list to private continued to be
 * readable by everyone they had already added - the control existed, it was labelled,
 * the route answered 200, and the reads it was supposed to close stayed open. The
 * failure mode is the worst kind: it looks like it worked.
 *
 * The access rows surviving is what makes the pause reversible. Re-sharing restores
 * exactly the same audience without anybody being asked for their address again.
 *
 * The group term is inside the same `AND` as the visibility term and that placement
 * is load-bearing in the same way. A `ListGroupAccess` row is a row like any other,
 * it survives going private for the same reason `ListAccess` does, and putting the
 * group disjunction outside the `AND` would have handed every member of every group a
 * read on every list that had ever been shared with it - including the ones its owner
 * had just closed.
 */
const readableBy = (accountId: string) =>
  ({
    OR: [{ ownerId: accountId }, readableWhileShared(accountId)],
  }) satisfies Prisma.ListWhereInput;

/**
 * The second half of `readableBy`, written out.
 *
 * It exists as a named value rather than being spelled a third time inline, and that
 * is the point: the `visibility: 'SHARED'` term was once dropped from one copy of
 * this predicate and not from the other, and the resulting bug - a paused list still
 * sitting in somebody else's "shared with you" section - is described at
 * `listSummariesFor` below. Three copies of a security predicate is three chances to
 * drop a term from exactly one of them. So there are two: this one, and
 * `readableBy`, which composes it.
 */
const readableWhileShared = (
  accountId: string
): Prisma.ListWhereInput => ({
  AND: [
    { visibility: 'SHARED' },
    {
      OR: [
        { access: { some: { accountId } } },
        {
          groupAccess: {
            some: { group: { members: { some: { accountId } } } },
          },
        },
      ],
    },
  ],
});

/** One row of the contents page, with the counts it is read by. */
export interface StoredListSummary {
  id: string;
  name: string;
  visibility: ListVisibility;
  ownerId: string;
  ownerDisplayName: string;
  giftCounts: { unbought: number; total: number };
  sharedWithCount: number;
  /**
   * How many groups reach this list, counted beside the people rather than folded
   * into them.
   *
   * Two numbers rather than one, and the reason is that the honest people count is not
   * a cheap query while a dishonest one is worse than useless: individuals and group
   * members overlap, so somebody in two granted groups is one reader and would be
   * counted twice by a sum. What the contents page is asking is how wide the list
   * reaches, and "3 people · 1 group" answers it with two `_count`s and no join.
   */
  sharedWithGroupCount: number;
  isOwner: boolean;
  createdAt: Date;
}

type StoredListWithCounts = Prisma.ListGetPayload<{
  include: {
    owner: { select: { id: true; displayName: true } };
    _count: { select: { access: true; groupAccess: true } };
    gifts: { select: { isPurchased: true } };
  };
}>;

const toSummary = (list: StoredListWithCounts, accountId: string): StoredListSummary => ({
  id: list.id,
  name: list.name,
  visibility: list.visibility,
  ownerId: list.owner.id,
  ownerDisplayName: list.owner.displayName,
  giftCounts: {
    unbought: list.gifts.filter((gift) => !gift.isPurchased).length,
    total: list.gifts.length,
  },
  sharedWithCount: list._count.access,
  sharedWithGroupCount: list._count.groupAccess,
  isOwner: list.ownerId === accountId,
  createdAt: list.createdAt,
});

const summaryInclude = {
  owner: { select: { id: true, displayName: true } },
  _count: { select: { access: true, groupAccess: true } },
  gifts: { select: { isPurchased: true } },
} satisfies Prisma.ListInclude;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Everything on the contents page: the lists this account owns, and the lists
 * other people have shared with it.
 *
 * One query for each rather than one query with an `OR`, because the two halves
 * are rendered as two sections and the page needs to know which is which - and an
 * account that owns a list is never also on its access list, so a single `OR` would
 * double-count nothing but would still have to be split again here.
 *
 * `visibility: 'SHARED'` on the second half is the same term `readableBy` carries,
 * and it was missing here after the same reasoning was wrong there: a paused list
 * still has its access rows, so omitting the term left a list the owner had just
 * made private sitting in somebody else's "shared with you" section. Opening it
 * answered 404 and the row was still there - which is the shape of bug that reads
 * as "the link is broken" rather than as "this list is not yours to see", and it is
 * also a disclosure: the name of a list, and who owns it, still reaching somebody who
 * should no longer be able to see that it exists.
 *
 * One predicate, written twice, was enough for it to be wrong twice. The two copies
 * are `readableWhileShared` above and the `where` below, and they are now a single
 * value used by both rather than two literals that have to agree: `readableBy`
 * composes the helper, and this query uses it directly, so the term cannot be dropped
 * from one without the other noticing. The assertion that they agree is the test.
 */
export const listSummariesFor = async (
  accountId: string
): Promise<{ owned: StoredListSummary[]; shared: StoredListSummary[] }> => {
  const [owned, shared] = await Promise.all([
    prisma.list.findMany({
      where: { ownerId: accountId },
      include: summaryInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.list.findMany({
      where: readableWhileShared(accountId),
      include: summaryInclude,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    owned: owned.map((list) => toSummary(list, accountId)),
    shared: shared.map((list) => toSummary(list, accountId)),
  };
};

/** A list this account may read, or `not_found`. */
export const findReadableList = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredList>> => {
  const list = await prisma.list.findFirst({
    where: { id: listId, ...readableBy(accountId) },
  });
  return list ? done(list) : refused('not_found');
};

/**
 * The whole `StoredListSummary` for a list this account may read, authorized by the same
 * predicate as `findReadableList`.
 *
 * This exists because the sheet page is opened from a cold deep link at least as
 * often as it is from a contents-page row, so it cannot assume the client already
 * holds the owner's name and the audience size that `GET /api/lists` supplies. Two
 * fields were being fetched for that by a `prisma.list.findUnique` in the route -
 * a query with no predicate of its own, sitting one line away from the authorized
 * read that was supposed to gate it. That is the exact shape of the bug this module
 * exists to end, and it appeared here within one commit of the module being written
 * to prevent it. The route now calls this instead, and the handler contains no
 * query that is not already somebody else's decision about what may be read.
 *
 * One query rather than two: the owner name and the audience count ride along with
 * the authorization, so there is no window in which the two halves of a sheet
 * disagree.
 */
export const readableListSummary = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredListSummary>> => {
  const list = await prisma.list.findFirst({
    where: { id: listId, ...readableBy(accountId) },
    include: summaryInclude,
  });
  return list ? done(toSummary(list, accountId)) : refused('not_found');
};

/** A list this account owns, or `not_found`. */
export const findOwnedList = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredList>> => {
  const list = await prisma.list.findFirst({
    where: { id: listId, ownerId: accountId },
  });
  return list ? done(list) : refused('not_found');
};

/**
 * The gate every owner-only capability goes through.
 *
 * It returns `not_found` rather than `forbidden` when the account cannot even read
 * the list, and only `forbidden` when it can read it and is not the owner. That
 * ordering is deliberate: an account with no relationship to a list must not be
 * able to learn that it exists by being told it is off limits.
 */
export const requireWritableList = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredList>> => {
  const owned = await findOwnedList(listId, accountId);
  if (owned.ok) return owned;

  const readable = await findReadableList(listId, accountId);
  return readable.ok ? refused('forbidden') : refused('not_found');
};

/** The people this list is shared with. Owner only - a buyer is not shown the audience. */
export interface StoredAccessRow {
  id: string;
  accountId: string | null;
  email: string;
  displayName: string;
  grantedAt: Date;
}

export const accessForList = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredAccessRow[]>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const rows = await prisma.listAccess.findMany({
    where: { listId },
    include: {
      account: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: { grantedAt: 'asc' },
  });

  return done(
    rows.map((row) => ({
      id: row.id,
      accountId: row.account.id,
      email: row.account.email,
      displayName: row.account.displayName,
      grantedAt: row.grantedAt,
    }))
  );
};

/**
 * The groups this list is shared with. Owner only, like `accessForList`.
 *
 * A second function rather than a second half of one return value, because the two
 * rows are different shapes and folding them into a union would make every caller
 * narrow on a discriminant before it could read a name. The dialog renders people and
 * groups as two lists of rows precisely because a group row is a control that
 * withdraws reach from several people at once, and printing nine names for one group
 * would say the list is shared nine times.
 *
 * `memberCount` is the size of the group, not the number of additional readers this
 * list gains: somebody in two granted groups is one reader, and counting reach
 * exactly is the distinct-count join `sharedWithGroupCount` explains avoiding.
 */
export interface StoredGroupAccessRow {
  id: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  grantedAt: Date;
}

export const groupAccessForList = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredGroupAccessRow[]>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const rows = await prisma.listGroupAccess.findMany({
    where: { listId },
    include: {
      group: {
        select: { id: true, name: true, _count: { select: { members: true } } },
      },
    },
    orderBy: { grantedAt: 'asc' },
  });

  return done(
    rows.map((row) => ({
      id: row.id,
      groupId: row.group.id,
      groupName: row.group.name,
      memberCount: row.group._count.members,
      grantedAt: row.grantedAt,
    }))
  );
};

// ---------------------------------------------------------------------------
// Owning a list
// ---------------------------------------------------------------------------

export const createList = async (
  input: { name: string; visibility: ListVisibility },
  ownerId: string
): Promise<StoredList> =>
  prisma.list.create({
    data: { name: input.name, visibility: input.visibility, ownerId },
  });

export const renameList = async (
  listId: string,
  accountId: string,
  name: string
): Promise<Outcome<StoredList>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);
  return done(await prisma.list.update({ where: { id: listId }, data: { name } }));
};

/**
 * Set the visibility, owner only.
 *
 * Moving to `PRIVATE` leaves the access rows in place and is therefore reversible
 * and non-destructive: it closes the reads and nothing else. Moving back to
 * `SHARED` reopens them to exactly the same audience. No toggle in this product
 * destroys anything - deleting a list is the only irreversible control, and it
 * carries a confirmation for that reason.
 */
export const setVisibility = async (
  listId: string,
  accountId: string,
  visibility: ListVisibility
): Promise<Outcome<StoredList>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);
  return done(
    await prisma.list.update({ where: { id: listId }, data: { visibility } })
  );
};

/**
 * Delete a list and every idea on it.
 *
 * The cascade is the schema's (`Gift.listId` is `onDelete: Cascade`) and it is
 * why the confirmation states the consequence rather than asking whether the user
 * is sure: there is no second copy and no undo, which makes this the highest-stakes
 * action in the product.
 */
export const deleteList = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredList>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);
  const list = await prisma.list.delete({ where: { id: listId } });
  return done(list);
};

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

/**
 * Give one named account the list.
 *
 * Requires `SHARED`, and requires the address to already belong to an account.
 * There is no pending grant: recording access for an address that has not
 * registered would mean a second way to be in the audience, and resolving it later
 * would mean a resolution pass during registration. Neither buys anything here,
 * because there is no mail to tell the recipient they had been invited - so the
 * owner says it out loud either way.
 *
 * Split from the group grant below rather than sharing one body, because the two
 * refuse different things and a single function branching on which field arrived is a
 * function whose refusals are spread across both branches. This one knows about
 * accounts and has exactly one account-shaped failure, `no_such_account`.
 */
export const grantAccessToAccount = async (
  listId: string,
  ownerId: string,
  email: string
): Promise<Outcome<StoredAccessRow>> => {
  const gate = await requireWritableList(listId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return refused('not_found');
  if (list.visibility !== 'SHARED') return refused('not_shared_yet');

  const account = await prisma.account.findUnique({ where: { email } });
  if (!account) return refused('no_such_account');
  if (account.id === ownerId) return refused('cannot_share_with_owner');

  const existing = await prisma.listAccess.findFirst({
    where: { listId, accountId: account.id },
  });
  if (existing) return refused('already_shared');

  const row = await prisma.listAccess.create({
    data: { listId, accountId: account.id },
    include: {
      account: { select: { id: true, email: true, displayName: true } },
    },
  });

  return done({
    id: row.id,
    accountId: row.account.id,
    email: row.account.email,
    displayName: row.account.displayName,
    grantedAt: row.grantedAt,
  });
};

/**
 * Give one whole group the list.
 *
 * Every member reaches it, with exactly the access an individual invitation gives -
 * readable, and able to mark bought. Not a lesser or a different kind of grant, which
 * is the reason `readableBy` has one column for both rather than a tier each: the
 * requirement is that a group member is treated as a person who was invited, and
 * anything else would be inventing a permission the product does not have.
 *
 * The group must belong to the caller. `no_such_group` rather than `forbidden`,
 * because a group somebody else owns is not something this account has any
 * relationship to, and confirming it exists is the disclosure `lib/group-access.ts`
 * header rule 2 exists to prevent.
 *
 * Refused on a private list with `not_shared_yet`, before the group is even looked
 * at, and that order is deliberate: the visibility of the list is the owner's own
 * business, and there is no answer here that depends on whether the group exists.
 *
 * `already_shared` is reused rather than given a group-shaped twin. The sentence a
 * person needs for "this list is already shared with Family" is the sentence they
 * already have for a person, and the closed union in `lib/refusals.ts` should not
 * grow two names for one thing.
 */
export const grantAccessToGroup = async (
  listId: string,
  ownerId: string,
  groupId: string
): Promise<Outcome<StoredGroupAccessRow>> => {
  const gate = await requireWritableList(listId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return refused('not_found');
  if (list.visibility !== 'SHARED') return refused('not_shared_yet');

  const group = await prisma.group.findFirst({
    where: { id: groupId, ownerId },
    include: { _count: { select: { members: true } } },
  });
  if (!group) return refused('no_such_group');

  const existing = await prisma.listGroupAccess.findFirst({
    where: { listId, groupId },
  });
  if (existing) return refused('already_shared');

  const row = await prisma.listGroupAccess.create({
    data: { listId, groupId },
    include: {
      group: {
        select: { id: true, name: true, _count: { select: { members: true } } },
      },
    },
  });

  return done({
    id: row.id,
    groupId: row.group.id,
    groupName: row.group.name,
    memberCount: row.group._count.members,
    grantedAt: row.grantedAt,
  });
};

/**
 * Take one account back off the list.
 *
 * Keyed by the access row rather than by account id, so the URL names the thing
 * being withdrawn. Available in either visibility state and never conditional on
 * `SHARED`: withdrawing access is the one action here that can only reduce what an
 * account can reach, so there is no state in which it should be refused.
 */
export const revokeAccess = async (
  listId: string,
  ownerId: string,
  accessId: string
): Promise<Outcome<StoredAccessRow>> => {
  const gate = await requireWritableList(listId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  const row = await prisma.listAccess.findFirst({
    where: { id: accessId, listId },
    include: {
      account: { select: { id: true, email: true, displayName: true } },
    },
  });
  if (!row) return refused('not_found');

  await prisma.listAccess.delete({ where: { id: row.id } });
  return done({
    id: row.id,
    accountId: row.account.id,
    email: row.account.email,
    displayName: row.account.displayName,
    grantedAt: row.grantedAt,
  });
};

/**
 * Take one whole group back off the list.
 *
 * Keyed by the grant row rather than by group id, so the URL names the thing being
 * withdrawn and two lists sharing one group have two different grants to withdraw.
 * Scoped by `{ id, listId }` for the reason `lib/group-access.ts` header rule 1
 * records: a grant id is looked up with its parent in the same query, never alone.
 *
 * Available in either visibility state and never conditional on `SHARED`, exactly as
 * `revokeAccess` is. Withdrawing is the one action on an audience that can only
 * reduce what somebody else can reach, so there is no state in which refusing it
 * would be right.
 *
 * It withdraws the group and nothing else. Everybody who also holds an individual
 * grant keeps it, which is `readableBy` being an `OR` rather than this function
 * having to check anything - the row it deletes was the only record that the group
 * reached this list, and once it is gone there is no second path to revoke.
 */
export const revokeGroupAccess = async (
  listId: string,
  ownerId: string,
  accessId: string
): Promise<Outcome<StoredGroupAccessRow>> => {
  const gate = await requireWritableList(listId, ownerId);
  if (!gate.ok) return refused(gate.refusal);

  const row = await prisma.listGroupAccess.findFirst({
    where: { id: accessId, listId },
    include: {
      group: {
        select: { id: true, name: true, _count: { select: { members: true } } },
      },
    },
  });
  if (!row) return refused('not_found');

  await prisma.listGroupAccess.delete({ where: { id: row.id } });
  return done({
    id: row.id,
    groupId: row.group.id,
    groupName: row.group.name,
    memberCount: row.group._count.members,
    grantedAt: row.grantedAt,
  });
};

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

/**
 * Every idea on a list this account may read, newest first.
 *
 * Readable by a buyer as well as the owner. The bought mark is the coordination
 * mechanism and a buyer who cannot see the list cannot coordinate, which is the
 * whole reason anyone is added to one.
 */
export const listGifts = async (
  listId: string,
  accountId: string
): Promise<Outcome<StoredGift[]>> => {
  const gate = await findReadableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const gifts = await prisma.gift.findMany({
    where: { listId },
    orderBy: { createdAt: 'desc' },
  });
  return done(gifts);
};

/**
 * Whether this reader may take this mark back off.
 *
 * The rule, once more: an open idea can be marked by anyone who can read the list;
 * a mark can be cleared by whoever set it; a buyer can clear anybody's, because the
 * mark is shared and correcting another buyer's mark is the coordination working;
 * an owner may **not** clear somebody else's, because they are the one account with
 * a reason to want the gift cancelled.
 *
 * This exists as a named function because the interface cannot work it out.
 * `purchasedById` never leaves the server - it must not, the buyer's identity is
 * not a product output - so a client holding the wire shape genuinely cannot tell
 * whose mark it is looking at, and the only formula it can apply is "an owner may
 * not clear any mark". That is the safe direction, but it silently forbids an owner
 * from undoing "I already bought this myself", which the rule above grants, and it
 * does so while the server would have allowed it: the table and the interface
 * disagreeing on one row, which is how an interface and a permission model drift
 * apart without either being wrong on its own.
 *
 * So the server answers the question the client actually has, which is *may I*,
 * rather than the question it cannot answer, which is *who did*. One boolean per
 * idea, carrying no name and no id. `tests/sharing.spec.ts` asserts it from the
 * outside as well, because a rule only one implementation knows about is a rule
 * with one implementation.
 */
export const mayClearMark = (
  gift: { isPurchased: boolean; purchasedById: string | null },
  accountId: string,
  isOwner: boolean
): boolean =>
  !gift.isPurchased || !isOwner || gift.purchasedById === accountId;

/**
 * Write a new idea onto the list. Owner only.
 *
 * The mark cannot be set at creation, for the reason it never could: an idea
 * enters the sheet open, and the bought flag is a shared ritual rather than
 * something the person writing the idea down gets to pre-empt. That still holds
 * when the writer and the recipient are the same person, which is the case now.
 */
export const addGift = async (
  input: { title: string; description?: string; url?: string },
  listId: string,
  accountId: string
): Promise<Outcome<StoredGift>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const gift = await prisma.gift.create({
    data: {
      title: input.title,
      description: input.description,
      url: input.url,
      listId,
    },
  });
  return done(gift);
};

/**
 * The ritual: put the mark on an idea, or take it off again.
 *
 * This is the one capability an invited account has, and it is deliberately not a
 * plain toggle, because the permission to set the mark and the permission to clear
 * it are not the same permission:
 *
 *   - setting is allowed for anybody who can read the list, owner included, and
 *     records who did it;
 *   - clearing is allowed for whoever set it, and for an invited account clearing
 *     anybody's - the mark is shared, and correcting another buyer's mark is the
 *     coordination working;
 *   - clearing is refused for an owner on a mark somebody else set, and that is
 *     the one refusal in the product with a reason worth stating in the interface.
 *
 * `purchasedById` is written here and read here. It is never returned: the caller
 * maps the outcome onto a response, and the response shape in `types.ts` has no
 * field to put it in.
 */
export type ToggledGift = { gift: StoredGift; isOwner: boolean };

/**
 * The mark, as a conditional write rather than a read followed by an update.
 *
 * The first version read the idea and then wrote `!isPurchased`, and put the owner's
 * restriction in JavaScript: `if (isOwner && purchasedById !== accountId) refuse`.
 * That is correct when nothing else happens in between, and something else can.
 * This product's whole premise is several people buying the same gift at the same
 * time, and the exact race is two of them tapping within the same few milliseconds:
 *
 *   both read `isPurchased: false`
 *   the buyer writes `true, purchasedById: buyer`
 *   the owner writes `true, purchasedById: owner`   <- overwrites the attribution
 *
 * The mark itself survives, so nobody double-buys and the guarantee holds. But the
 * attribution now names the owner, which means the buyer can no longer undo their
 * own claim, and the restriction this function exists to enforce was enforced
 * against a value that had already gone stale.
 *
 * So the expected current state moves into the `where` and the database decides.
 * `updateMany` matched zero rows means somebody beat us to it, and the answer is
 * whatever is true now - re-read and return it - rather than a blind overwrite.
 * The owner's restriction becomes `purchasedById: accountId` in the predicate
 * instead of a branch above the write, so there is no window in which it can be
 * stale.
 *
 * Still three round trips: authorise, conditional write, read back. The read-back
 * exists because `updateMany` returns a count and not a row, and returning the row
 * is what lets the caller replace its copy without a fourth request.
 */
export const toggleGiftPurchased = async (
  listId: string,
  giftId: string,
  accountId: string
): Promise<Outcome<ToggledGift>> => {
  const gate = await findReadableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const isOwner = gate.value.ownerId === accountId;
  const current = await prisma.gift.findFirst({
    where: { id: giftId, listId },
  });
  if (!current) return refused('not_found');

  /*
    The owner's refusal is decided by the database here, not by a branch. An owner
    *clearing* asks for `purchasedById: accountId`, so a mark somebody else set does
    not match and the write simply does not happen - which is the rule, expressed as
    a condition on the row rather than as an intention checked a moment earlier.

    The condition is on the clearing path only, and that asymmetry is the whole
    point. An owner *claiming* an open idea must not ask for `purchasedById:
    accountId`: an open idea has `purchasedById: null`, so that predicate would
    match no row and the owner would be unable to record "I already got this
    myself", which is the case the claim path exists for.
  */
  const clearing = current.isPurchased;
  const claimed = await prisma.gift.updateMany({
    where: {
      id: giftId,
      /*
        The state we expect to find is the state we read, not the state we are
        about to write. The first version put the negation here, which is the value
        the update is setting - so a clear looked for an open idea, matched nothing,
        and silently became a no-op that reported success. The write lost a race
        that never happened.
      */
      isPurchased: current.isPurchased,
      ...(isOwner && clearing ? { purchasedById: accountId } : {}),
    },
    data: clearing
      ? { isPurchased: false, purchasedById: null }
      : { isPurchased: true, purchasedById: accountId },
  });

  /*
    Nobody matched. Either the state moved between the read and the write, or the
    owner was refused. Both are answered by looking again rather than by writing
    anyway - and the owner's refusal is only reported when they were clearing, for
    the same asymmetry: losing the race to claim is not being forbidden from
    clearing.

    The first of those two is tested and the second is not, and the distinction is
    worth stating rather than letting the gap read as an oversight.

    An owner clearing a mark somebody else set is refused by the predicate above,
    so their write matches nothing - which is how `tests/sharing.spec.ts` gets its
    `cannot_clear_purchase` on the ordinary path. No race is involved; the refusal
    is the rule working, expressed as a condition on the row.

    What has no test is the case the conditional write exists for: an owner who *was*
    entitled to clear, whose write matched nothing because the state moved between
    their read and their write. Producing it means interrupting two operations that
    belong in one function from the outside, so a test would have to add a delay that
    does not exist in production and then assert on its own timing.
  */
  const gift = await prisma.gift.findFirst({ where: { id: giftId, listId } });
  if (!gift) return refused('not_found');

  if (
    claimed.count === 0 &&
    clearing &&
    isOwner &&
    gift.purchasedById !== accountId
  ) {
    return refused('cannot_clear_purchase');
  }

  /*
    Either the write landed, or we lost a race we were entitled to win and somebody
    marked or unmarked the same idea between our read and our write. Returning the
    current row covers both, and it is the honest answer: the interface shows the
    state that is true rather than the one it hoped for.
  */
  return done({ gift, isOwner });
};

/** Take an idea off the sheet entirely. Owner only. */
export const removeGift = async (
  listId: string,
  giftId: string,
  accountId: string
): Promise<Outcome<StoredGift>> => {
  const gate = await requireWritableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const gift = await prisma.gift.findFirst({ where: { id: giftId, listId } });
  if (!gift) return refused('not_found');

  await prisma.gift.delete({ where: { id: giftId } });
  return done(gift);
};

/**
 * The most wishes one transfer may name.
 *
 * Not a timeout guard: a batch is one read and one write whatever its size, so the
 * number of statements no longer grows with the selection. What still grows is the
 * `IN (...)` list of the read and the single `INSERT` of a copy, and a sheet is ticked
 * by hand - nobody ticks a hundred wishes one at a time and means them as one
 * decision. A list that long is filed in two goes.
 *
 * There is no measurement behind exactly 100. It sits far above anything a person
 * selects and far below anything one statement minds, so it is a bound rather than a
 * tuned value. The refusal's sentence (`giftsTransferTooMany`) names no figure for the
 * same reason, which is what lets this number change here alone.
 */
export const MAX_TRANSFER_BATCH = 100;

/*
  The one failure inside the move's transaction that is a result rather than an
  error: a row that stopped being on the source list between the read above and the
  guarded write below. Its own type so the catch around the transaction can answer
  it with the same `not_found` the pre-flight check gives - a race a caller can see
  and retry - instead of letting it escape as an unhandled exception that the route
  answers with a 500. Anything else thrown inside the transaction is not foreseeable
  and stays an exception.
*/
class GiftLeftSource extends Error {}

/**
 * The id a copy is given when its attempt has a name.
 *
 * Derived from the attempt rather than remembered, and that is the whole reason a
 * copy can be sent twice and land once without a table to record that it was: the
 * same attempt asks for the same ids, so the second `INSERT` finds them taken and
 * skips them. Remembering the attempt instead would need a row per request, a
 * cleanup for it, and a migration - all for a fact the ids can carry themselves.
 *
 * Four inputs, and each is there because leaving it out merges two things that must
 * stay apart. The account, so one person's attempt name can never collide with
 * another's. The source wish, so the wishes of one batch get different ids. The
 * destination, so the same wish filed onto two lists under one attempt name - a
 * reader who fails once, then picks another list - is two copies and not one.
 * Hashed rather than concatenated so the attempt name, which the caller chooses,
 * cannot be shaped to read as a different account's or a different wish's id.
 *
 * `c` and 24 hex characters is the shape `cuid()` produces for the rows around it,
 * so nothing downstream can tell a keyed row from any other.
 */
const keyedGiftId = (
  accountId: string,
  requestId: string,
  sourceGiftId: string,
  targetListId: string
): string =>
  'c' +
  createHash('sha256')
    .update([accountId, requestId, sourceGiftId, targetListId].join('\u0000'))
    .digest('hex')
    .slice(0, 24);

/**
 * Put one or more ideas from this list onto another list this account owns, keeping
 * them or leaving them behind.
 *
 * Owner on both ends, and the two ends are gated differently - see header rule 5.
 * The source is `requireWritableList` because the caller is removing from it, which
 * is a write; the destination is `findOwnedList` because a list the caller can only
 * read is not a place a wish may be put.
 *
 * **`move` keeps the mark, `copy` leaves it behind - and that is the
 * entire design.** A moved idea arrives on the target exactly as it
 * stood: a bought one arrives bought, carrying the account that
 * marked it, so it cannot become purchasable again on the other
 * sheet, and an open one arrives open. `move` is therefore a bare
 * re-point, and the double-buy the mark exists to prevent is
 * prevented on the target exactly as it was on the source.
 *
 * A **copy** is a new thought on a new sheet, so it arrives as an
 * *open* wish: `isPurchased` false, no attribution, ready to be
 * marked by the target's own audience. The original keeps its mark
 * on the source, because copying changes nothing there - the
 * coordination the mark carries is neither duplicated onto the
 * target nor lost from the source. That is why the copy branch
 * writes two literals instead of the row's own values, and why
 * there is no branch anywhere on `isPurchased`: a moved wish must
 * not arrive open, and a copied one must.
 *
 * **Nothing the copy reads can change.** The only mutation the product
 * makes to a gift row is the mark - there is no edit endpoint - and
 * the mark no longer travels with a copy, so the fields the copy
 * reads (`title`, `description`, `url`, `createdAt`) are the same at
 * the insert as they were at the read, whichever request lands in
 * between. The old reason this read's timing mattered - a buyer
 * marking mid-flight would be copied with the mark it carried by
 * then - went away with the mark itself. `move` reads nothing: it
 * re-points the row, so the row's own state is its own answer.
 *
 * **All of it or none of it.** A batch of twelve that lands eight is worse than
 * retyping the twelve, and it is the only failure mode this function creates that
 * did not exist before it. A requested id that is not on the source refuses the whole
 * batch rather than transferring the ones that happened to exist, and each mode is
 * atomic on its own terms: a copy is one `INSERT`, which Postgres applies whole or
 * not at all, and a move is one `UPDATE` whose row count is checked inside a
 * transaction that is rolled back when it comes up short.
 *
 * **Two statements, whatever the size.** The first version wrote one row at a time
 * inside an interactive transaction. That is a round trip per wish, and Prisma ends
 * an interactive transaction after five seconds unless told otherwise - so how long a
 * batch took grew with its size while the allowance did not, and the way it failed was
 * a 500 on a request that had asked for nothing wrong. A read and a write cost the
 * same for three wishes as for a hundred, which is also why the size is capped by
 * `MAX_TRANSFER_BATCH` and not by the clock.
 *
 * **Sending it again is safe.** The sheet cannot tell a request that never arrived
 * from one whose reply was lost, and its answer to both is "press it again" - the
 * selection and the dialog are still there. That has to be harmless, and it is made so
 * without remembering anything:
 *
 *   - A **move** that finds every requested wish already on the destination, and none
 *     on the source, is a move that already happened. It answers with the same
 *     success and writes nothing. It stays all-or-nothing: one id that is on neither
 *     list is still `not_found`, because that is a request naming something that is
 *     not there rather than a request repeated.
 *   - A **copy** has no such tell. The source looks the same before and after, and
 *     identical-looking wishes on the destination may be there on purpose - copying a
 *     wish again is what the mark's design is *for*, a present that is wanted twice.
 *     So the caller supplies the tell: `requestId` names one attempt and the id of
 *     every copy is derived from it (`keyedGiftId`), so the same attempt sent twice
 *     writes the same ids and the second insert skips them. A new attempt carries a
 *     new `requestId` and writes new rows, which is what keeps "copy it again"
 *     meaning what it says. With no `requestId` nothing is derived and the copy is
 *     exactly as repeatable as it was.
 *
 * `count` is how many of the batch's wishes are on the destination when this returns:
 * the batch size, and the same on a repeat that wrote nothing.
 */
export const transferGifts = async (
  input: { giftIds: string[]; mode: 'copy' | 'move'; requestId?: string },
  listId: string,
  targetListId: string,
  accountId: string
): Promise<Outcome<{ count: number }>> => {
  /*
    Deduplicated first, because every length in this function is only honest against
    what was actually asked for: `findMany` answers a repeated id with one row, and
    compared against the raw length a redundant request would be refused as
    `not_found` for a wish that was found. The sheet's own selection cannot repeat an
    id - it is toggled - so this is the crafted-request case, answered as the
    duplicate it is.
  */
  const giftIds = [...new Set(input.giftIds)];

  /*
    An empty batch is refused here as well as in the route, because this is the
    function that would otherwise report it as a success. With nothing named every
    length check below is `0 === 0`, so a copy or a move of nothing would answer `ok`
    with a count of zero - a success for a request that did nothing, which a second
    caller that is not the route could hand it without anyone noticing.

    `nothing_to_change` rather than `not_found`: it is the same 400 the route gives
    for the same body, whereas a 404 would say that something the caller named is
    missing, and they named nothing.
  */
  if (giftIds.length === 0) return refused('nothing_to_change');

  /*
    Refused before either list is looked up, and that order discloses nothing: the
    answer is decided from the body alone, so it is the same for a stranger as for the
    owner and says nothing about whether either list exists. It also spares two
    lookups for a request that cannot succeed.
  */
  if (giftIds.length > MAX_TRANSFER_BATCH) return refused('too_many_gifts');

  const source = await requireWritableList(listId, accountId);
  if (!source.ok) return refused(source.refusal);

  /*
    The destination is checked after the source and with a different gate, and the
    order is the point: a buyer is refused at the source before a second list is
    looked at at all, so nothing about the caller's other lists is observable to
    somebody who cannot write to the one they named.
  */
  const target = await findOwnedList(targetListId, accountId);
  if (!target.ok) return refused(target.refusal);

  /*
    Refused on the request shape rather than looked up, and 400 rather than 404 for
    the reason `lib/api-refusal.ts` records: both ids are already known to be the
    caller's own, so there is nothing here being hidden. A transfer onto the sheet
    it started from is a client that built its request wrong, not a permission
    question, and the picker never offers it.
  */
  if (listId === targetListId) return refused('already_on_this_list');

  /*
    Scoped to the source list, and that scoping is the batch's security property: an
    id belonging to some other sheet matches no row here, so the length check below
    refuses it and a caller cannot use a transfer to pull an idea off a list they
    only have read access to - or off anybody's list at all.
  */
  const rows = await prisma.gift.findMany({
    where: { id: { in: giftIds }, listId },
  });

  /*
    One bad id refuses all of them. A partial transfer is the failure this function
    must not have, and it is refused here - before anything is written, where there
    is still nothing to undo - rather than detected halfway through.
  */
  if (rows.length !== giftIds.length) {
    /*
      The one way "not on the source" is not a refusal: a move that has already
      happened, asked for again because its reply was lost. Every requested wish is
      on the destination, so the answer is the success the first attempt should have
      delivered.

      Scoped to the destination, which the gate above has just shown this account
      owns, so the lookup tells the caller nothing about a list that is not theirs.
      And it is all of them or it is a refusal: a request naming one wish that has
      landed and one that is somewhere else is not a repeat of anything.
    */
    if (input.mode === 'move') {
      const landed = await prisma.gift.count({
        where: { id: { in: giftIds }, listId: targetListId },
      });
      if (landed === giftIds.length) return done({ count: landed });
    }

    return refused('not_found');
  }

  if (input.mode === 'copy') {
    const { requestId } = input;

    /*
      `createdAt` is carried so the copy lands on the target in the position it
      holds on the source. `listGifts` orders by `createdAt desc`, and a copied
      idea that jumped to the top of a list it was written for last year would
      say the owner had just thought of it.

      The mark is the one thing deliberately NOT carried. A copy is a new
      thought on a new sheet, so it arrives open - `isPurchased: false` and no
      attribution - and the target's own audience is the one that decides
      whether it is already bought. The source keeps its mark, untouched,
      because this branch inserts rather than updates.

      One statement, so it needs no transaction: it is applied whole or not at all.
      And it needs no guard on the source either, which is what the move below has
      to carry - it inserts rather than re-points, so there is no row that could have
      moved underneath it.

      `skipDuplicates` only when the attempt is named. That is the half of the
      repeat-safety that lives here: a repeat derives the same ids and they are
      skipped. Without a name there are no derived ids to collide, and switching it
      on anyway would turn any future unique constraint on this table into a silent
      no-op instead of an error.
    */
    await prisma.gift.createMany({
      data: rows.map((row) => ({
        id:
          requestId === undefined
            ? undefined
            : keyedGiftId(accountId, requestId, row.id, targetListId),
        title: row.title,
        description: row.description,
        url: row.url,
        isPurchased: false,
        purchasedById: null,
        createdAt: row.createdAt,
        listId: targetListId,
      })),
      skipDuplicates: requestId !== undefined,
    });

    return done({ count: rows.length });
  }

  /*
    Wrapped in a transaction for one reason: a write that has to be *checked* and able
    to undo itself. A single `UPDATE` is atomic, but it is atomic over the rows that
    still match, and a batch that moved nine of ten is the partial transfer this
    function must not have. The transaction is what lets the count below veto it.

    The condition on the update is the narrowing. `where: { id, listId }` says "these
    rows, and only while they are still on the source", so a row that somebody moved
    between the read above and this write matches nothing and the batch is refused
    whole. The unguarded form - `where: { id }` - would have quietly re-pointed a wish
    from whatever list it had moved to in the meantime, which is a batch landing on
    the target with a row in it that was never selected from the source. That window is
    narrow and it is the same shape of failure as the partial batch: wishes on a list
    the reader did not choose.

    One statement inside it, so unlike the loop it replaced it cannot run into the
    transaction's time limit however long the selection is.
  */
  try {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.gift.updateMany({
        where: { id: { in: giftIds }, listId },
        data: { listId: targetListId },
      });

      /*
        Fewer rows matched than were read, so some of them are no longer where they
        were when this batch was composed. Throwing rolls the whole transaction back,
        which is the only way to keep the promise above: a batch that cannot land
        entirely does not land. The dedicated type is what lets the catch below answer
        this as a refusal rather than as a server error.
      */
      if (moved.count !== rows.length) {
        throw new GiftLeftSource(
          `Some of ${rows.length} gifts are no longer on list ${listId}`
        );
      }
    });
  } catch (error) {
    /*
      The rollback has already happened by the time the error arrives here. Only the
      race is translated; everything else is a failure this function cannot foresee,
      and those stay exceptions so the route answers them as the 500 they are.
    */
    if (error instanceof GiftLeftSource) return refused('not_found');
    throw error;
  }

  return done({ count: rows.length });
};

/**
 * One account's address, looked up for the sign-in path.
 *
 * Returned with the password hash, so this is the only function in the module that
 * hands a hash to anything. It exists as a named function so that the place a hash
 * is read is one line to grep for.
 */
export const findAccountByEmail = async (
  email: string
): Promise<StoredAccount | null> =>
  prisma.account.findUnique({ where: { email } });