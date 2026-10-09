import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { addGift } from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireGift } from '@/lib/wire';
import { checkGiftField, isWebAddress, type GiftField } from '@/lib/gift-text';

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

      It is also the only field with a floor, and the floor is above one character
      for the same reason the ceiling exists: a cell called "A" is not a wish, it is
      a keypress that got in before the reader thought about what they meant.
    */
    if (typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'An idea needs a title' },
        { status: 400 }
      );
    }

    /*
      How much of a wish fits on a sheet, checked here as well as in the form.

      The form's `maxLength` is a claim about the browser and not about the request,
      and a limit that only exists in the DOM is not a limit - so this is the same
      rule the client uses, from `lib/gift-text.ts`, over the same three numbers. A
      wish is the one thing in this product that anybody can type into at length, and
      Postgres will hold all of it: unbounded text in the schema means a request
      that ignored the attribute produced a cell that filled the viewport and pushed
      the rest of the sheet off the page.

      Each field is checked against its own bound rather than one shared number,
      because they are three different things - a name, a note, and an address that
      is never displayed - and one number for all three would either truncate a wish
      title to a paragraph or let a link run to a kilobyte.
    */
    const fields: [GiftField, unknown][] = [
      ['title', title],
      ['description', description],
      ['url', url],
    ];

    for (const [field, value] of fields) {
      if (typeof value !== 'string') continue;
      /*
        `checkGiftField` rather than a hand-rolled length test, because it is the one
        place that knows both bounds. Checking only the ceiling here left
        `MIN_TITLE_LENGTH` declared in `lib/gift-text.ts` and enforced nowhere: a wish
        called "A" passed the server and rendered as a cell with a single letter in
        it, which is not a wish anybody can buy. The blank check above still runs
        first and still owns its own message, because "this field is empty" and "this
        field is too short" are different sentences and only the first one is about a
        field the reader left alone.
      */
      const problem = checkGiftField(field, value, {
        tooLong: (max) => `That ${field} is longer than ${max} characters`,
        tooShort: (min) => `That ${field} needs at least ${min} characters`,
      });
      if (problem) {
        return NextResponse.json({ message: problem, field }, { status: 400 });
      }
    }

    /*
      A link is only stored if it is one a buyer can safely be sent to - see
      `isWebAddress`. A field-shape refusal like the length ones above, so it names
      the field and carries no code. A blank link is no link and is not refused.
    */
    const link = optionalText(url);
    if (link !== undefined && !isWebAddress(link)) {
      return NextResponse.json(
        { message: 'That url must start with http:// or https://', field: 'url' },
        { status: 400 }
      );
    }

    const gift = await addGift(
      {
        title: title.trim(),
        description: optionalText(description),
        url: link,
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
