import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { addGift } from '@/lib/list-access';
import type { Gift as StoredGift } from '@prisma/client';
import type { Gift } from '@/types';
import { refusalResponse } from '@/lib/api-refusal';

/**
 * A gift as it goes on the wire.
 *
 * Every field is named, and the one that is not is the point. The Prisma row
 * `addGift` returns carries `purchasedById`, because
 * `toggleGiftPurchased` has to be able to tell the owner's mark from somebody
 * else's - and a spread would carry that column straight out to the browser, where
 * the buyer's identity becomes a product output and the surprise the product exists
 * to protect is spent. Enumerating the fields *is* the guarantee: the only way for
 * `purchasedById` to reach a response is for somebody to type it here on purpose.
 * The same mapping is written out in `app/api/lists/[id]/route.ts` and
 * `app/api/lists/[id]/gifts/[giftId]/toggle/route.ts`; a change to one is a change
 * to all three.
 *
 * The mark cannot be set here even though the column is writable. An idea enters
 * the sheet open, and the bought flag is a shared ritual rather than something the
 * person writing the idea down gets to pre-empt - which still holds now that the
 * person writing it down is usually the person receiving it.
 */
const toWireGift = (gift: StoredGift): Gift => ({
  id: gift.id,
  title: gift.title,
  description: gift.description,
  url: gift.url,
  isPurchased: gift.isPurchased,
  // A brand-new idea is open, and an open idea is clearable by anyone who can read
  // the list - so this is `true` by definition rather than by argument, and needs no
  // call into `mayClearMark`. Only the owner's own list accepts a new idea, so the
  // reader of this response is its owner, who may certainly take it back off.
  canClear: true,
  createdAt: gift.createdAt.toISOString(),
  updatedAt: gift.updatedAt.toISOString(),
  listId: gift.listId,
});

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
      gift: toWireGift(gift.value),
    });
  } catch (error) {
    console.error('Error adding gift:', error);
    return NextResponse.json(
      { message: 'Failed to add gift' },
      { status: 500 }
    );
  }
};
