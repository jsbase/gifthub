import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { revokeAccess } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';

type AccessContext = { params: Promise<{ id: string; accessId: string }> };

export const DELETE: (
  request: NextRequest,
  context: AccessContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id, accessId } = await params;

    /*
      Keyed by the access row, not by account id, so the URL names the thing being
      withdrawn. It matters that the two are not interchangeable: one account can
      hold access to several lists, and a URL built from the account id could not
      say which grant is being taken back.

      Not conditional on the list being `SHARED`, unlike granting. Withdrawing
      access is the one action in this product that can only reduce what an account
      can reach, so there is no state in which it is the right answer to refuse it.
    */
    const revoked = await revokeAccess(id, accountId, accessId);
    if (!revoked.ok) return refusalResponse(revoked.refusal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking list access:', error);
    return NextResponse.json(
      { message: 'Failed to remove access' },
      { status: 500 }
    );
  }
};
