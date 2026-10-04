import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { createGroup, groupsForAccount } from '@/lib/group-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireGroup } from '@/lib/wire';

/*
  The group's management surface, and the only place it is reachable from that is not
  a list. `types.ts:679-687` gives why it cannot live inside the share dialog: a
  group is created before there is any list to share it with, so it has to be
  reachable from somewhere that has nothing to do with a list yet.

  Two shapes in one file, as `app/api/lists/route.ts` has - a read of everything the
  caller owns, and a write that makes one more of those. Neither decides what may be
  read: `lib/group-access.ts` owns that surface, and the capability table in its
  header is the whole permission model for a group.
*/

export const GET: () => Promise<NextResponse> = async () => {
  try {
    /*
      No request parameter, for the reason `GET /api/lists` has none: the account
      comes from the session cookie, so this handler has nothing to read off the
      request.
    */
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /*
      A plain array and not an `Outcome`, so there is no refusal to map and no
      `refusalResponse` call in this function. That is a decision rather than a gap -
      the account came from the session and owns whatever it owns, so the empty array
      is a real answer for a new account instead of a failure to report, which is
      the same reasoning `listSummariesFor` gives for returning its two halves.
      `lib/group-access.ts:250-254` states it for this module.

      Owned groups only, with no "the groups I am in" beside them. Membership is not
      browsable (`lib/group-access.ts:61-67`): whose group somebody is in is the
      owner's business, and a member learns they have reached a list by opening it.
    */
    const groups = await groupsForAccount(accountId);

    return NextResponse.json({ groups: groups.map(toWireGroup) });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { message: 'Failed to fetch groups' },
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

    const { name } = await request.json();

    /*
      Inline and not a `Refusal`, for the reason `app/api/lists/route.ts:85-94` gives
      for a list name: this is a fact about the request that arrived rather than a
      state in the world, and no code in the closed vocabulary covers it.
      `nothing_to_change` is about a body that named neither or both of the two
      fields a list PATCH may name, and `invalid_search_query` is about a lookup too
      short to run - neither is "you left the name blank". A refusal invented here
      would be a code `isRefusal` narrows and no client can have a sentence for,
      which is the failure the closed union exists to prevent
      (`lib/refusals.ts:10-13`).

      Trimmed here rather than after the write, so `createGroup` is handed the name
      the owner will see on the row and the emptiness check and the stored value
      cannot disagree about what counts as blank. `lib/group-access.ts:343-347`
      puts the check in this file on purpose, next to the field a person typed it
      into.
    */
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { message: 'A group needs a name' },
        { status: 400 }
      );
    }

    /*
      The session's account is the owner and the body cannot name one, so a request
      has no way to create a group under somebody else's name - that is the reason
      the parameter is the session's id rather than an owner the caller supplies
      (`lib/group-access.ts:309-313`).

      The one refusal this can produce is `duplicate_group_name`, and it is the
      unique index's answer rather than a pre-check's. The reasons not to spend a
      round trip on it - and why the same reasoning makes a pre-check actively wrong
      in `renameGroup` - are at `lib/group-access.ts:322-347`.
    */
    const created = await createGroup(accountId, name.trim());
    if (!created.ok) return refusalResponse(created.refusal);

    return NextResponse.json({
      success: true,
      /*
        The created row and not a summary, for the reason the list route returns a
        row rather than a summary (`app/api/lists/route.ts:97-102`) and with none of
        the difficulty: a group has no owner display name and no audience to count
        until it is shared with a list, so there is nothing on this row that would
        have to be invented. `memberCount` is 0 and says so honestly.

        The dialog re-reads the whole collection after any change
        (`types.ts:977`), so this row exists for the one control that needs the id
        and is not a second source of truth about a group's size.
      */
      group: toWireGroup(created.value),
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { message: 'Failed to create group' },
      { status: 500 }
    );
  }
};