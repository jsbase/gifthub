import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import {
  createList,
  listSummariesFor,
  type ListSummary as StoredSummary,
} from '@/lib/list-access';
import type { ListSummary, ListVisibility } from '@/types';

/**
 * A contents-page row, as it goes on the wire.
 *
 * Every field is named, and the reason is the same one that governs gifts: a
 * spread would carry whatever column `List` happens to have next year straight out
 * to the browser, and the only way for that to be a decision rather than an
 * accident is if the decision has to be typed. `createdAt` is the one field that
 * genuinely differs from the stored row - Prisma hands back a `Date` and
 * `types.ts` says a string - and it is converted here rather than left to
 * `JSON.stringify`, so the response is the shape the type claims on any
 * serialization.
 */
const toWireSummary = (list: StoredSummary): ListSummary => ({
  id: list.id,
  name: list.name,
  visibility: list.visibility,
  ownerId: list.ownerId,
  ownerDisplayName: list.ownerDisplayName,
  giftCounts: list.giftCounts,
  sharedWithCount: list.sharedWithCount,
  isOwner: list.isOwner,
  createdAt: list.createdAt.toISOString(),
});

/**
 * The two visibilities, or `PRIVATE` for a request that named neither.
 *
 * The fallback is the restrictive one, and that is the whole decision. A list's
 * reach is the only thing in this product that can put one person's ideas in front
 * of another, so a request that is silent about it gets the answer that cannot do
 * that. `createListDialog` always sends one, so this is a path a client bug takes
 * rather than a state a person can reach.
 */
const acceptedVisibility = (value: unknown): ListVisibility =>
  value === 'PRIVATE' || value === 'SHARED' ? value : 'PRIVATE';

export const GET: () => Promise<NextResponse> = async () => {
  try {
    /*
      No request parameter. The account comes from the session cookie, so this
      handler has nothing to read off the request - it used to accept one and pass
      it to an auth helper that never opened it, so the parameter only asserted
      that a request object existed.
    */
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { owned, shared } = await listSummariesFor(accountId);

    return NextResponse.json({
      owned: owned.map(toWireSummary),
      shared: shared.map(toWireSummary),
    });
  } catch (error) {
    console.error('Error fetching lists:', error);
    return NextResponse.json(
      { message: 'Failed to fetch lists' },
      { status: 500 }
    );
  }
};

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, visibility } = await request.json();

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { message: 'A list needs a name' },
        { status: 400 }
      );
    }

    const list = await createList(
      { name: name.trim(), visibility: acceptedVisibility(visibility) },
      accountId
    );

    /*
      The row and not a summary: the contents page re-reads both halves after a
      creation anyway, and a summary would have to invent the owner's display name
      and an audience count that do not exist yet - zero of each, on a list this
      person owns and has shared with nobody.
    */
    return NextResponse.json({
      success: true,
      list: {
        id: list.id,
        name: list.name,
        visibility: list.visibility,
        createdAt: list.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating list:', error);
    return NextResponse.json(
      { message: 'Failed to create list' },
      { status: 500 }
    );
  }
};
