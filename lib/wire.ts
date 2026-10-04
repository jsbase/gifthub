import { mayClearMark } from '@/lib/list-access';
import type {
  Gift,
  Group,
  GroupMember,
  ListAccess,
  ListGroupAccess,
} from '@/types';

/**
 * The one place a stored row becomes a response body.
 *
 * These three functions existed as private copies in three route files, and the
 * copies had drifted: two took `(gift, accountId, isOwner)` and computed the
 * bought mark's clearability through `mayClearMark`, and the third - the one that
 * answers "an idea was added" - took only the gift and wrote `canClear: true`.
 *
 * That third copy is the reason this module exists rather than being tidiness. A
 * route had hardcoded a permission, and the two were not the same code, so the row
 * you saw after adding an idea and the row you saw after reloading the sheet were
 * produced by different rules. Whichever of them was right, they could not both
 * stay right. `lib/list-access.ts` exists so that no route decides what may be read;
 * a route deciding *what a reader may undo* is the same mistake wearing a different
 * hat, and it is the kind that survives review because the hardcoded value happens
 * to be correct on the path anybody tested.
 *
 * Every field is listed explicitly rather than spread from the Prisma row. That is
 * not style: `Gift` on the wire is a strict subset of `Gift` on disk - it has no
 * `purchasedById` - so a spread would ship the buyer's account id to the browser the
 * first time a column was added to the schema, and nothing would fail.
 */

/** Dates become ISO strings at this boundary, because `types.ts` says so. */
const iso = (date: Date): string => date.toISOString();

/**
 * One signature for all three call sites.
 *
 * `isOwner` is passed rather than derived because the derivation is the whole
 * question: the row does not know who is asking, and the server does.
 */
export const toWireGift = (
  gift: {
    id: string;
    title: string;
    description: string | null;
    url: string | null;
    isPurchased: boolean;
    purchasedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    listId: string;
  },
  accountId: string,
  isOwner: boolean
): Gift => ({
  id: gift.id,
  title: gift.title,
  description: gift.description,
  url: gift.url,
  isPurchased: gift.isPurchased,
  /*
    The only field here that is not a copy, and the reason the function takes an
    account: whether this reader may take the mark back off depends on whose mark it
    is, and `purchasedById` - the only thing that knows - is deliberately not on the
    wire. See `mayClearMark` for why it is a permission rather than an attribution.
  */
  canClear: mayClearMark(gift, accountId, isOwner),
  createdAt: iso(gift.createdAt),
  updatedAt: iso(gift.updatedAt),
  listId: gift.listId,
});

/**
 * One person who may read one list.
 *
 * `accountId` is nullable on the wire because `ListAccess.accountId` is nullable on
 * disk: an account deleted while holding access leaves a row that has to stay
 * nameable, and the name it keeps is the address.
 */
export const toWireAccess = (row: {
  id: string;
  accountId: string | null;
  email: string;
  displayName: string;
  grantedAt: Date;
}): ListAccess => ({
  id: row.id,
  accountId: row.accountId,
  email: row.email,
  displayName: row.displayName,
  grantedAt: iso(row.grantedAt),
});

/**
 * One group on the list's audience.
 *
 * The four fields of `StoredGroupAccessRow` and no others, for the reason the header
 * gives. Note what is *not* here: the group's member list. A group row is one grant,
 * and shipping its members would both make the audience say a list is shared nine
 * times when it is shared once and put a per-member audience on the wire that no
 * client has any use for - the reader who is affected already learns that they are
 * affected by opening the list.
 */
export const toWireGroupAccess = (row: {
  id: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  grantedAt: Date;
}): ListGroupAccess => ({
  id: row.id,
  groupId: row.groupId,
  groupName: row.groupName,
  memberCount: row.memberCount,
  grantedAt: iso(row.grantedAt),
});

export const toWireGroup = (group: {
  id: string;
  name: string;
  memberCount: number;
  createdAt: Date;
}): Group => ({
  id: group.id,
  name: group.name,
  memberCount: group.memberCount,
  createdAt: iso(group.createdAt),
});

/**
 * One member of one group, as its owner sees it.
 *
 * The only place in the product where an account's nickname and email go to the wire
 * together outside the share dialog, and the reach is the same: the group's owner, who
 * put them there.
 */
export const toWireGroupMember = (member: {
  id: string;
  accountId: string;
  nickname: string;
  displayName: string;
  email: string;
  addedAt: Date;
}): GroupMember => ({
  id: member.id,
  accountId: member.accountId,
  nickname: member.nickname,
  displayName: member.displayName,
  email: member.email,
  addedAt: iso(member.addedAt),
});

/*
  There is deliberately no `toWireSearchResult`.

  Every other mapper in this file exists because the stored row and the wire row are
  different shapes - a `Date` becomes a string, `purchasedById` is dropped,
  `mayClearMark` is computed. `searchAccounts` in `lib/account-search.ts` already
  returns the wire shape: it names its four fields in a `select`, adds the one value no
  column holds (`matched`, which only the caller knows), and types the return as
  `AccountSearchResult`. A mapper over it would copy four fields into four fields and
  invent nothing, which is the ceremony this module exists to avoid - the header's
  reason is that a *spread* would carry a new column out silently, and an explicit
  `select` in the query is already that explicitness, one layer earlier and therefore
  closer to the column that would have to be added.
*/