import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { transferGifts } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';

type ListContext = { params: Promise<{ id: string }> };

/**
 * A batch of ideas from this list onto another one, keeping them or leaving them.
 *
 * One request for a whole selection rather than one per wish, and that is the
 * feature: a dozen ideas filed wrongly are one mistake, and a request each would be
 * a dozen chances for the batch to end up half-transferred.
 *
 * **The response is a count, not the wishes.** Two reasons, and the second is the
 * one that matters. The batch wrote to two sheets and the client is standing on one
 * of them, so the ideas now on the destination cannot be rendered from here at all
 * - the destination page fetches its own, and a gift in this response would be a row
 * the caller cannot place. And because the body names no gift field, `lib/wire.ts`'s
 * rule that `purchasedById` never reaches the browser is held here structurally: it
 * is held there by naming every field explicitly, and a response with nothing to
 * name cannot leak one.
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
    const { giftIds, targetListId, mode } = await request.json();

    /*
      The three fields, checked before anything is looked up.

      `mode` is checked against the two literals rather than cast, because the whole
      of `transferGifts`'s behaviour is selected by it: an unrecognised string would
      fall through to `copy`'s half of the branch and silently duplicate a selection
      the reader asked to move. And `giftIds` is checked as a non-empty array of
      strings so that `rows.length !== giftIds.length` inside `transferGifts` cannot
      be satisfied by an empty request - which would report success for a batch that
      did nothing.
    */
    if (
      !Array.isArray(giftIds) ||
      giftIds.length === 0 ||
      !giftIds.every((value) => typeof value === 'string') ||
      typeof targetListId !== 'string' ||
      targetListId.length === 0 ||
      (mode !== 'copy' && mode !== 'move')
    ) {
      return NextResponse.json(
        { message: 'Name the wishes, the destination and the mode' },
        { status: 400 }
      );
    }

    const result = await transferGifts(
      { giftIds, mode },
      id,
      targetListId,
      accountId
    );

    if (!result.ok) return refusalResponse(result.refusal);

    return NextResponse.json({
      success: true,
      count: result.value.transferred.length,
    });
  } catch (error) {
    console.error('Error transferring gifts:', error);
    return NextResponse.json(
      { message: 'Failed to transfer gifts' },
      { status: 500 }
    );
  }
};