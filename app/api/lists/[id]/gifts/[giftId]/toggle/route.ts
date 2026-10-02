import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { mayClearMark, toggleGiftPurchased } from '@/lib/list-access';
import type { Gift as StoredGift } from '@prisma/client';
import type { Gift } from '@/types';
import { refusalResponse } from '@/lib/api-refusal';

/**
 * A gift as it goes on the wire.
 *
 * Every field is named, and the one that is not is the point. The row this route
 * gets back is the one `toggleGiftPurchased` just wrote `purchasedById` into, or
 * nulled - the attribution the authorization needs in order to answer the next
 * toggle. A spread would hand that column to the browser, which is how the person
 * who bought the present gets named on the list it was bought from, and the
 * surprise the product exists to protect stops existing. Enumerating the fields *is*
 * the guarantee. The same mapping is written out in `app/api/lists/[id]/route.ts`
 * and `app/api/lists/[id]/gifts/route.ts`; a change to one is a change to all three.
 */
const toWireGift = (gift: StoredGift, accountId: string, isOwner: boolean): Gift => ({
  id: gift.id,
  title: gift.title,
  description: gift.description,
  url: gift.url,
  isPurchased: gift.isPurchased,
  canClear: mayClearMark(gift, accountId, isOwner),
  createdAt: gift.createdAt.toISOString(),
  updatedAt: gift.updatedAt.toISOString(),
  listId: gift.listId,
});

type GiftContext = { params: Promise<{ id: string; giftId: string }> };

export const POST: (
  request: NextRequest,
  context: GiftContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id, giftId } = await params;

    /*
      POST, not PUT, and the ids in the path rather than in a body. The group toggle
      was a `PUT` that took the gift id out of its own request body - unusual, and
      kept at the time only because that was the live wire contract. The contract
      moved when the gift stopped belonging to a member of a group, and this is the
      form it should have had all along: the id names the thing being marked, the
      way every other route in this product names it.
    */
    const toggled = await toggleGiftPurchased(id, giftId, accountId);
    if (!toggled.ok) return refusalResponse(toggled.refusal);

    return NextResponse.json({
      success: true,
      gift: toWireGift(toggled.value.gift, accountId, toggled.value.isOwner),
    });
  } catch (error) {
    console.error('Error toggling gift status:', error);
    return NextResponse.json(
      { message: 'Failed to update gift status' },
      { status: 500 }
    );
  }
};
