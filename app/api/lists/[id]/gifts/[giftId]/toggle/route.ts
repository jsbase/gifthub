import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { toggleGiftPurchased } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireGift } from '@/lib/wire';

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
