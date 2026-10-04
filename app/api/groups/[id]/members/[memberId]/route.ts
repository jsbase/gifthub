import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { removeMember } from '@/lib/group-access';
import { refusalResponse } from '@/lib/api-refusal';

type MemberContext = { params: Promise<{ id: string; memberId: string }> };

export const DELETE: (
  request: NextRequest,
  context: MemberContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id, memberId } = await params;

    /*
      Keyed by the membership row rather than by the account, so the URL names the
      thing being withdrawn and not the person - the same reasoning as
      `app/api/lists/[id]/access/[accessId]/route.ts:20-24`. The two are not
      interchangeable here either: one account can be in several of an owner's
      groups, and a URL built from the account id could not say which membership is
      being taken back. It is also the safer of the two keys, for the reason
      `removeMember` scopes its lookup by `{ id, groupId }` rather than `{ id }`
      alone (`lib/group-access.ts:560-565`) - that incident is the one this
      parameter shape exists to avoid repeating.

      Nothing is conditional before the call, unlike granting. Removing somebody is
      the one action on a group that can only reduce what an account can reach: the
      reach is derived rather than stored, so there is no state in which refusing
      would be the right answer, and no `SHARED`-first condition to check the way
      `grantAccessToAccount` needs one (`lib/list-access.ts:504-506`). The
      confirmation is therefore the client's (`types.ts:711`) and this route cannot
      ask - a query parameter asking whether is not a confirmation.
    */
    const removed = await removeMember(id, accountId, memberId);
    if (!removed.ok) return refusalResponse(removed.refusal);

    /*
      An acknowledgement. The row is not echoed because the owner is looking at
      the very row they pressed the control on: every field on it is already in front
      of them, and removal only ever takes away from it, so there is nothing in a
      response a client could not have read a moment before the click.

      `not_found` from `removeMember` discloses nothing here. The gate above it has
      already established that this group is the caller's, so there is no
      not-theirs case left to conceal - which is why it is `not_found` and not
      `no_such_group`, the same distinction `revokeAccess` draws
      (`lib/group-access.ts:567-572`).
    */
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json(
      { message: 'Failed to remove group member' },
      { status: 500 }
    );
  }
};