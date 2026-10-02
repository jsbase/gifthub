import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * A gift as Prisma holds it. Dates are still `Date` at this seam; it is the route
 * serialising the response that turns them into strings, and that serialised
 * shape is the one `Gift` in `types.ts` describes. Typing these functions as
 * returning `Gift` would claim the conversion had already happened.
 */
type StoredGift = Prisma.GiftGetPayload<Record<string, never>>;

/**
 * Writing a gift inside a group.
 *
 * Every function here takes the group id and scopes its query by it. That is the
 * whole point of the module: the rule "this request may only touch a gift that
 * belongs to its own group" used to be re-typed as a Prisma `where` clause in
 * every handler, and it had already drifted once - the member-removal route
 * looked its row up by id alone, so a membership belonging to another group was
 * found, the gift delete correctly refused, and the membership delete then threw
 * into a 500 that the other handlers would have answered with a 404.
 *
 * Handlers are adapters. They parse a request and map an outcome onto a status;
 * they do not decide what may be read.
 *
 * Note what is deliberately absent: there is no repository port here. Prisma is
 * the only implementation, and a seam with one adapter is indirection rather than
 * a seam.
 */

/** What a handler needs to turn an outcome into a response. */
export type GiftOutcome =
  | { ok: true; gift: StoredGift }
  | { ok: false; reason: 'not_found' };

/** A gift the group is allowed to see, or `null` - which also covers "no group". */
export async function findGift(
  giftId: string,
  groupId: string
): Promise<StoredGift | null> {
  return prisma.gift.findFirst({ where: { id: giftId, groupId } });
}

/** Every idea on the list, or one member's, newest first. */
export async function listGifts(
  groupId: string,
  memberId?: string | null
): Promise<StoredGift[]> {
  return prisma.gift.findMany({
    where: { groupId, ...(memberId ? { forMemberId: memberId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Write a new idea onto a member's sheet.
 *
 * The mark cannot be set at creation: an idea enters the sheet open, and the
 * bought flag is a group-wide ritual rather than something the person writing
 * the idea down gets to pre-empt.
 */
export async function addGift(
  input: { title: string; description?: string; url?: string; forMemberId: string },
  groupId: string
): Promise<StoredGift> {
  return prisma.gift.create({
    data: {
      title: input.title,
      description: input.description,
      url: input.url,
      groupId,
      forMemberId: input.forMemberId,
    },
  });
}

/**
 * The ritual: put the mark on an idea, or take it off again. The new state is
 * the opposite of the current one, so the handler never has to know which it is.
 */
export async function toggleGiftPurchased(
  giftId: string,
  groupId: string
): Promise<GiftOutcome> {
  const gift = await findGift(giftId, groupId);
  if (!gift) return { ok: false, reason: 'not_found' };

  const updated = await prisma.gift.update({
    where: { id: giftId, groupId },
    data: { isPurchased: !gift.isPurchased },
  });
  return { ok: true, gift: updated };
}

/** Take an idea off the sheet entirely. */
export async function removeGift(
  giftId: string,
  groupId: string
): Promise<GiftOutcome> {
  const gift = await findGift(giftId, groupId);
  if (!gift) return { ok: false, reason: 'not_found' };

  await prisma.gift.delete({ where: { id: giftId, groupId } });
  return { ok: true, gift };
}