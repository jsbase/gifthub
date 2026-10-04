import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import {
  accessForList,
  deleteList,
  groupAccessForList,
  listGifts,
  readableListSummary,
  renameList,
  setVisibility,
} from '@/lib/list-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireAccess, toWireGift, toWireGroupAccess } from '@/lib/wire';

type ListContext = { params: Promise<{ id: string }> };

export const GET: (
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
      One sheet in one request. `isOwner` decides which controls exist at all and
      `giftCounts` is here rather than recomputed in the client, so the number on a
      contents-page row and the number above a sheet are the same number.

      The first read is the one that decides whether this account may see the list at
      all, and it carries the whole `ListSummary` - owner's name, audience size and
      counts - so a sheet opened from a cold deep link has everything it needs and
      this handler contains no query of its own. An earlier version fetched two of
      those fields with a `prisma.list.findUnique` that had no predicate, placed
      immediately after the authorized read. That is the shape of bug this module
      was written to end, and it turned up within one commit of it being written;
      `readableListSummary` in `lib/list-access.ts` is now the single call, and the
      concern is not left as a comment here but moved to where the rule belongs.
    */
    const summary = await readableListSummary(id, accountId);
    if (!summary.ok) return refusalResponse(summary.refusal);

    const list = summary.value;
    const isOwner = list.isOwner;

    const gifts = await listGifts(id, accountId);
    if (!gifts.ok) return refusalResponse(gifts.refusal);

    /*
      The audience is the owner's business, and `accessForList` says so by refusing a
      non-owner. It is therefore called only on the owner's side, and a buyer gets an
      empty array rather than a 403: the buyer can read the list, and the list they can
      read does not come with a directory of everyone else who can read it. That would
      be a second disclosure on top of the first, and it buys the buyer nothing - the
      mark is the only thing they can set, and it does not need an audience to be set.

      The count in `sharedWithCount` is a different matter from the array below, and it
      is returned to everybody. `GET /api/lists` already puts it in the summary of every
      list this account may read, including the ones other people shared with it, so the
      number is not a new disclosure - it is a new place to read one this account was
      already given.
    */
    const audience = isOwner ? await accessForList(id, accountId) : null;
    if (audience && !audience.ok) return refusalResponse(audience.refusal);

    /*
      The group half of the audience, under the same three conditions as the people
      half above and for the same reasons: it is the owner's business, it is withheld
      from a buyer, and a buyer reading this list does not get a directory of everyone
      who shares it. `groupAccessForList` gates on ownership internally, so the `null`
      for a non-owner is decided here rather than asked for and refused.
    */
    const groupAudience = isOwner ? await groupAccessForList(id, accountId) : null;
    if (groupAudience && !groupAudience.ok) {
      return refusalResponse(groupAudience.refusal);
    }

    return NextResponse.json({
      // `createdAt` is still a `Date` at the seam and becomes a string here, for the
      // same reason the gifts are mapped rather than spread: the response is the shape
      // `types.ts` describes, not a shape that happens to agree. Everything else on the
      // summary is already the wire shape, because `ListSummary` was written as what a
      // row needs rather than as what the database holds.
      list: { ...list, createdAt: list.createdAt.toISOString() },
      gifts: gifts.value.map((gift) => toWireGift(gift, accountId, isOwner)),
      access: (audience?.value ?? []).map(toWireAccess),
      groupAccess: (groupAudience?.value ?? []).map(toWireGroupAccess),
      isOwner,
      giftCounts: list.giftCounts,
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    return NextResponse.json(
      { message: 'Failed to fetch list' },
      { status: 500 }
    );
  }
};

export const PATCH: (
  request: NextRequest,
  context: ListContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, visibility } = await request.json();

    /*
      `null` counts as absent rather than as a value. A form that clears its field
      and sends the whole body sends null for the one it did not touch, and reading
      that as "set the name to nothing" would be a way to empty a list by accident.
    */
    const wantsRename = name !== undefined && name !== null;
    const wantsVisibility = visibility !== undefined && visibility !== null;

    if (!wantsRename && !wantsVisibility) {
      return refusalResponse('nothing_to_change');
    }

    /*
      One request changes one thing. The rename field and the visibility control are
      separate controls in the interface, and a request naming both would mean this
      handler deciding which one wins - a question about the interface's state
      machine, asked of the layer that is supposed to know nothing about it.

      All three refusals in this handler go through `lib/api-refusal.ts` rather than
      spelling out a status and a `code`. They used to be inline, with `code` values
      that were not in the closed union - which `isRefusal` rejects, so no client
      could ever have had a sentence for them. A refusal raised outside the
      vocabulary is a refusal the product cannot word.
    */
    if (wantsRename && wantsVisibility) {
      return refusalResponse('ambiguous_change');
    }

    /*
      Both of the branches below answer `{ success: true }` and not the changed row.
      A row returned by a rename or a visibility change has no counts and no audience,
      so echoing it would hand the client a `ListSummary` with holes in it - and a
      partially populated summary is worse than none, because a row that renders from
      it shows a count of nothing. The contents page re-reads both halves after a change
      anyway (`onListChanged`), and the sheet knows which of the two values it just asked
      for. So this route has two shapes: `GET`, which is a whole sheet, and `PATCH`,
      which is an acknowledgement.
    */
    if (wantsRename) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { message: 'A list needs a name' },
          { status: 400 }
        );
      }

      const renamed = await renameList(id, accountId, name.trim());
      if (!renamed.ok) return refusalResponse(renamed.refusal);

      return NextResponse.json({ success: true });
    }

    if (visibility !== 'PRIVATE' && visibility !== 'SHARED') {
      return refusalResponse('invalid_visibility');
    }

    const changed = await setVisibility(id, accountId, visibility);
    if (!changed.ok) return refusalResponse(changed.refusal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating list:', error);
    return NextResponse.json(
      { message: 'Failed to update list' },
      { status: 500 }
    );
  }
};

export const DELETE: (
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
      The cascade to every idea on the list is the schema's and it is the reason the
      confirmation states the consequence rather than asking whether the person is
      sure. Nothing is returned but the fact: the row is gone, and there is no
      second copy to describe.
    */
    const removed = await deleteList(id, accountId);
    if (!removed.ok) return refusalResponse(removed.refusal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json(
      { message: 'Failed to delete list' },
      { status: 500 }
    );
  }
};
