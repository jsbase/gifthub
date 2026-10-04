import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { grantAccessToAccount, grantAccessToGroup } from '@/lib/list-access';
import { acceptedEmail } from '@/lib/email';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireAccess, toWireGroupAccess } from '@/lib/wire';

type ListContext = { params: Promise<{ id: string }> };

/**
 * One route, two kinds of grant, because the body names which.
 *
 * A person and a group are the same capability with a different audience, so they share
 * the path, the ownership gate, the `not_shared_yet` refusal and the response envelope.
 * A separate `/access/groups` route was rejected: it would have duplicated the
 * visibility gate, and the gate is the part of this handler most worth having exactly
 * one copy of.
 *
 * The body names `email` or `groupId`, never neither and never both, reusing the
 * request-shape vocabulary `app/api/lists/[id]/route.ts` already established - those two
 * refusals are documented as "the body named neither or both of the fields it may name"
 * (`lib/refusals.ts:28-31`), and a body with three possible fields is not a new concept
 * for them.
 */
export const POST: (
  request: NextRequest,
  context: ListContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { email, groupId } = await request.json();

    /*
      Which kind of grant, decided before either is validated, because a request naming
      both is ambiguous rather than twice-wrong: the owner clicked one control, so the
      body is the thing that is wrong and there is no reading of it that says which was
      meant. Answering `ambiguous_change` rather than picking one is the same choice
      `PATCH /api/lists/{id}` makes about a name and a visibility in one body.
    */
    const namesEmail = email !== undefined && email !== null;
    const namesGroup = groupId !== undefined && groupId !== null;

    if (namesEmail && namesGroup) return refusalResponse('ambiguous_change');
    if (!namesEmail && !namesGroup) return refusalResponse('nothing_to_change');

    if (namesGroup) {
      if (typeof groupId !== 'string' || groupId.length === 0) {
        return refusalResponse('no_such_group');
      }

      const granted = await grantAccessToGroup(id, accountId, groupId);
      if (!granted.ok) return refusalResponse(granted.refusal);

      /*
        The envelope names the row's kind in both branches. A client that merges the two
        responses without checking would otherwise be reading `access.groupName` off a
        person grant, and the audience it renders would be wrong in a way that looks
        like a rendering bug rather than a wrong answer from the server.
      */
      return NextResponse.json({
        success: true,
        groupAccess: toWireGroupAccess(granted.value),
      });
    }

    /*
      Normalised here for the same reason the register route normalises: the address
      the owner typed is the address that has to match the row, and an owner typing
      a capital first letter is not a different person. `grantAccessToAccount` looks
      the account up by whatever it is handed, so this route owns the normalisation
      that makes the lookup correct.

      The address goes out as it was typed rather than being validated against the
      account here, so a malformed one comes back as `invalid_email` and the share
      dialog can say it on the field somebody typed it into.
    */
    const normalizedEmail = acceptedEmail(email);
    if (normalizedEmail === undefined) {
      return refusalResponse('invalid_email');
    }

    const granted = await grantAccessToAccount(id, accountId, normalizedEmail);
    if (!granted.ok) return refusalResponse(granted.refusal);

    return NextResponse.json({
      success: true,
      access: toWireAccess(granted.value),
    });
  } catch (error) {
    console.error('Error granting list access:', error);
    return NextResponse.json(
      { message: 'Failed to share list' },
      { status: 500 }
    );
  }
};
