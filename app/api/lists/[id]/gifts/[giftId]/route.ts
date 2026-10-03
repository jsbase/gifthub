import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { removeGift } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';

type GiftContext = { params: Promise<{ id: string; giftId: string }> };

export const DELETE: (
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
      Nothing comes back but the fact. The row is gone, and the gift a handler would
      have echoed - a `StoredGift`, `purchasedById` and all - is precisely the
      shape that must not reach a response, so deleting one is the one case where
      the smallest answer is also the right one.
    */
    const removed = await removeGift(id, giftId, accountId);
    if (!removed.ok) return refusalResponse(removed.refusal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gift:', error);
    return NextResponse.json(
      { message: 'Failed to delete gift' },
      { status: 500 }
    );
  }
};
