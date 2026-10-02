import { NextRequest, NextResponse } from 'next/server';
import { requireGroupId } from '@/lib/auth-server';
import { toggleGiftPurchased } from '@/lib/gift-write';

/*
  Marking an idea bought, or moving it back.

  The handler does two things and knows nothing else: it answers "which group is
  this?", and it turns an outcome into a status. Whether a gift may be touched
  at all is `lib/gift-write`'s answer, not this file's.

  The id arrives in the request body rather than the pathname. That is unusual,
  but this endpoint is the live one and the sheet already sends it this way, so
  normalising it would be a wire-contract change for no gain - the same shape
  used to be read by two handlers, and only this one has a caller.
*/
export const PUT: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    const outcome = await toggleGiftPurchased(id, groupId);

    if (!outcome.ok) {
      return NextResponse.json({ message: 'Gift not found' }, { status: 404 });
    }

    return NextResponse.json({ isPurchased: outcome.gift.isPurchased });
  } catch (error) {
    console.error('Error toggling gift status:', error);
    return NextResponse.json(
      { message: 'Failed to update gift status' },
      { status: 500 }
    );
  }
};