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
 *   capability                          owner   invited on SHARED   anyone else
 *   --------------------------------------------------------------------------------
 *   read the list and its ideas           yes            yes            404
 *   mark an OPEN idea bought             yes            yes            404
 *   clear a mark they set                 yes            yes            404
 *   clear a mark somebody else set        403            yes            404
 *   add an idea                           yes            403            404
 *   delete an idea                        yes            403            404
 *   rename the list                       yes            403            404
 *   change visibility                     yes            403            404
 *   grant access (needs SHARED)           yes            403            404
 *   revoke access                         yes            403            404
 *   delete the list (cascades ideas)      yes            403            404
 *
 * Three things in that table are not obvious and each has a reason.
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
 * Note what is deliberately absent: there is no repository port here. Prisma is
 * the only implementation, and a seam with one adapter is indirection rather than
 * a seam.
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
 * who owns it - and by an account holding a `ListAccess` row **only while the list
 * is `SHARED`**.
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
 */
const readableBy = (accountId: string) =>
  ({
    OR: [
      { ownerId: accountId },
      {
        AND: [
          { visibility: 'SHARED' },
          { access: { some: { accountId } } },
        ],
      },
    ],
  }) satisfies Prisma.ListWhereInput;

/** One row of the contents page, with the counts it is read by. */
export interface ListSummary {
  id: string;
  name: string;
  visibility: ListVisibility;
  ownerId: string;
  ownerDisplayName: string;
  giftCounts: { unbought: number; total: number };
  sharedWithCount: number;
  isOwner: boolean;
  createdAt: Date;
}

type StoredListWithCounts = Prisma.ListGetPayload<{
  include: {
    owner: { select: { id: true; displayName: true } };
    _count: { select: { access: true } };
    gifts: { select: { isPurchased: true } };
  };
}>;

const toSummary = (list: StoredListWithCounts, accountId: string): ListSummary => ({
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
  isOwner: list.ownerId === accountId,
  createdAt: list.createdAt,
});

const summaryInclude = {
  owner: { select: { id: true, displayName: true } },
  _count: { select: { access: true } },
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
 * are deliberate rather than shared: `readableBy` is a private helper because its
 * shape is an internal detail, and the assertion that they agree is the test below.
 */
export const listSummariesFor = async (
  accountId: string
): Promise<{ owned: ListSummary[]; shared: ListSummary[] }> => {
  const [owned, shared] = await Promise.all([
    prisma.list.findMany({
      where: { ownerId: accountId },
      include: summaryInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.list.findMany({
      where: { visibility: 'SHARED', access: { some: { accountId } } },
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
 * The whole `ListSummary` for a list this account may read, authorized by the same
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
): Promise<Outcome<ListSummary>> => {
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
export interface AccessRow {
  id: string;
  accountId: string | null;
  email: string;
  displayName: string;
  grantedAt: Date;
}

export const accessForList = async (
  listId: string,
  accountId: string
): Promise<Outcome<AccessRow[]>> => {
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
 */
export const grantAccess = async (
  listId: string,
  ownerId: string,
  email: string
): Promise<Outcome<AccessRow>> => {
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
): Promise<Outcome<AccessRow>> => {
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

export const toggleGiftPurchased = async (
  listId: string,
  giftId: string,
  accountId: string
): Promise<Outcome<ToggledGift>> => {
  const gate = await findReadableList(listId, accountId);
  if (!gate.ok) return refused(gate.refusal);

  const gift = await prisma.gift.findFirst({ where: { id: giftId, listId } });
  if (!gift) return refused('not_found');

  const isOwner = gate.value.ownerId === accountId;

  if (!gift.isPurchased) {
    const claimed = await prisma.gift.update({
      where: { id: giftId },
      data: { isPurchased: true, purchasedById: accountId },
    });
    return done({ gift: claimed, isOwner });
  }

  const setBySomebodyElse = gift.purchasedById !== accountId;

  if (isOwner && setBySomebodyElse) {
    return refused('cannot_clear_purchase');
  }

  const cleared = await prisma.gift.update({
    where: { id: giftId },
    data: { isPurchased: false, purchasedById: null },
  });
  return done({ gift: cleared, isOwner });
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