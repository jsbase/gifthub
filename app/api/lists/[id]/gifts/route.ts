import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { addGift } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireGift } from '@/lib/wire';

/**
 * An optional field that arrived blank is stored as absent rather than as an empty
 * string, so a cell nobody filled in and a cell holding `""` are one state in the
 * database and one state on the sheet. The sheet's blank-cell sentence depends on
 * there being a difference between "nothing written" and "something written, and it
 * is blank".
 */
const optionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

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
    const { title, description, url } = await request.json();

    /*
      The only field the form insists on, and it is refused rather than stored
      empty: an unnamed cell on a sheet is not a smaller thing to buy, it is a
      question the sheet cannot answer.
    */
    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'An idea needs a title' },
        { status: 400 }
      );
    }

    const gift = await addGift(
      {
        title: title.trim(),
        description: optionalText(description),
        url: optionalText(url),
      },
      id,
      accountId
    );

    if (!gift.ok) return refusalResponse(gift.refusal);

    return NextResponse.json({
      success: true,
      /*
        `isOwner: true` because `addGift` is owner-only, so the only account that
        can reach this response is the owner - and a brand-new idea is open, so
        `mayClearMark` returns true for it whatever the owner flag says. It is passed
        rather than defaulted inside `toWireGift` because the mapper has no business
        knowing which route called it, and it is passed rather than hardcoded because
        this response used to carry its own `canClear: true`, which is how a route
        ended up holding a copy of a permission rule.
      */
      gift: toWireGift(gift.value, accountId, true),
    });
  } catch (error) {
    console.error('Error adding gift:', error);
    return NextResponse.json(
      { message: 'Failed to add gift' },
      { status: 500 }
    );
  }
};
