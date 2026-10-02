import { NextRequest, NextResponse } from 'next/server';
import { requireGroupId } from '@/lib/auth-server';
import { removeGift } from '@/lib/gift-write';

export const dynamic = 'force-dynamic';

/*
  Delete only. This file used to export GET, POST and PUT as well, and none of
  them was reachable:

  - GET and PUT read the gift id from the request *body*, which is not what a
    GET or a PUT is for, and their only caller was the toggle route.
  - POST was the edit-a-gift path. The interface has no editor, so it had none.
  - PUT was a verbatim duplicate of the toggle handler, differing only in the
    envelope it returned - `{success, gift}` where the live one returns
    `{isPurchased}`. Nothing read that envelope.

  The three-state update contract the POST carried - absent means leave the
  column alone, present-and-empty means clear it - has no user-facing feature
  behind it yet, so it went with the verb. It is written down in this comment
  rather than in code, because it is the part worth keeping.
*/
export const DELETE: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').pop();

  if (!id) {
    return NextResponse.json(
      { message: 'Gift ID is required' },
      { status: 400 }
    );
  }

  try {
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const outcome = await removeGift(id, groupId);

    if (!outcome.ok) {
      return NextResponse.json({ message: 'Gift not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gift deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting gift:', error);
    return NextResponse.json(
      { message: 'Failed to delete gift' },
      { status: 500 }
    );
  }
};