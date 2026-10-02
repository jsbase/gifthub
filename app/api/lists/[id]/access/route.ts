import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { grantAccess } from '@/lib/list-access';
import { acceptedEmail } from '@/lib/email';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireAccess } from '@/lib/wire';

type ListContext = { params: Promise<{ id: string }> };

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
    const { email } = await request.json();

    /*
      Normalised here for the same reason the register route normalises: the address
      the owner typed is the address that has to match the row, and an owner typing
      a capital first letter is not a different person. `grantAccess` looks the
      account up by whatever it is handed, so this route owns the normalisation that
      makes the lookup correct.
    */
    const normalizedEmail = acceptedEmail(email);
    if (normalizedEmail === undefined) {
      return refusalResponse('invalid_email');
    }

    const granted = await grantAccess(id, accountId, normalizedEmail);
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
