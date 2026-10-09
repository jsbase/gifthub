import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { transferGifts } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';

type ListContext = { params: Promise<{ id: string }> };

/**
 * What an attempt's name may look like: the characters of a UUID and of the
 * base-36 fallback the sheet uses where `crypto.randomUUID` does not exist, and no
 * more. It is hashed into the ids of the copies (`keyedGiftId`), so there is no
 * reason to accept anything the sheet cannot send, and a closed alphabet means no
 * request can smuggle a separator or a control character into that input.
 */
const REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * What a list's or a wish's id may look like. Every id in this product is a cuid or
 * a `keyedGiftId` - 25 letters and digits - so this is generous, and its job is not
 * to recognise an id but to keep a request from naming a string of any length and
 * any content and having it carried into a query.
 */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

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
 *
 * **`requestId` is optional, and what it buys is a safe second press.** It names one
 * attempt, so a request whose reply was lost can be sent again without a copy being
 * written twice - see `transferGifts` for how. It is optional because the route is
 * an API as well as the sheet's back end, and a caller that has no use for the
 * guarantee should not have to invent a value; the sheet always sends one.
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
    /*
      A body that is not JSON, or JSON that is not an object, is a malformed request
      and answered as one - with the same 400 as a body naming the wrong fields -
      rather than thrown into the 500 below, which would say the server had failed.
    */
    const body: unknown = await request.json().catch(() => null);
    const { giftIds, targetListId, mode, requestId } =
      typeof body === 'object' && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};

    /*
      The fields, checked before anything is looked up.

      `mode` is checked against the two literals rather than cast, because the whole
      of `transferGifts`'s behaviour is selected by it: an unrecognised string would
      fall through to `copy`'s half of the branch and silently duplicate a selection
      the reader asked to move. And `giftIds` is checked as a non-empty array of
      strings so that `rows.length !== giftIds.length` inside `transferGifts` cannot
      be satisfied by an empty request - which would report success for a batch that
      did nothing. `transferGifts` refuses an empty batch again for the same reason, so
      the guarantee does not depend on this being its only caller.

      `requestId` is allowed to be absent but not to be wrong. A present value that
      does not match is refused rather than ignored, because ignoring it would turn
      a caller's attempt at repeat-safety into a copy that is silently repeatable -
      the one outcome the field exists to prevent.

      How many ids is not checked here. The cap is a rule about the work a batch may
      ask for rather than about the shape of the body, and it lives in
      `transferGifts` beside the other rules about what a batch may do.
    */
    if (
      !Array.isArray(giftIds) ||
      giftIds.length === 0 ||
      !giftIds.every((value) => typeof value === 'string' && ID.test(value)) ||
      typeof targetListId !== 'string' ||
      !ID.test(targetListId) ||
      (mode !== 'copy' && mode !== 'move') ||
      (requestId !== undefined &&
        (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)))
    ) {
      return NextResponse.json(
        { message: 'Name the wishes, the destination and the mode' },
        { status: 400 }
      );
    }

    const result = await transferGifts(
      { giftIds, mode, requestId },
      id,
      targetListId,
      accountId
    );

    if (!result.ok) return refusalResponse(result.refusal);

    return NextResponse.json({
      success: true,
      count: result.value.count,
    });
  } catch (error) {
    console.error('Error transferring gifts:', error);
    return NextResponse.json(
      { message: 'Failed to transfer gifts' },
      { status: 500 }
    );
  }
};