import { mayClearMark } from '@/lib/list-access';
import type { Gift, ListAccess } from '@/types';

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