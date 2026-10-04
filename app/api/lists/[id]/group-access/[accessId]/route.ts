import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { revokeGroupAccess } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';

type GroupAccessContext = { params: Promise<{ id: string; accessId: string }> };

/**
 * Take one whole group back off a list.
 *
 * A second path rather than a branch inside `access/[accessId]`, and the reason is the
 * parameter has nothing to discriminate with. `DELETE` has no body, so the two row
 * kinds would have to be told apart by trying one table and then the other - and a
 * lookup that reaches for a row by id and, on failure, reaches for a same-shaped id in
 * a different table is the shape `lib/group-access.ts` header rule 1 exists to prevent.
 * It cost the product a cross-group existence oracle once already.
 *
 * Two paths also give the client two answers that cannot be confused: a group grant
 * always yields the group's own refusal vocabulary and never a person one, so the
 * audience row a person clicked is revoked by the route that understands what it is.
 */
export const DELETE: (
  request: NextRequest,
  context: GroupAccessContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id, accessId } = await params;

    /*
      Keyed by the grant row rather than by group id, so the URL names the thing being
      withdrawn: one group can be shared with several of this owner's lists and a URL
      built from the group id could not say which of those grants is being taken back.
      Scoped by `{ id, listId }` inside the module, never by the grant id alone, for
      the same reason `removeMember` scopes its membership lookup by `{ id, groupId }`.

      Not conditional on the list being `SHARED`, exactly as `revokeAccess` is not.
      Withdrawing is the one action on an audience that can only reduce what an account
      can reach, so there is no state in which refusing it would be right - including
      for a list its owner has just made private and then wants to clean up.
    */
    const revoked = await revokeGroupAccess(id, accountId, accessId);
    if (!revoked.ok) return refusalResponse(revoked.refusal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking group access:', error);
    return NextResponse.json(
      { message: 'Failed to remove group' },
      { status: 500 }
    );
  }
};