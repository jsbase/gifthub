import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import {
  deleteGroup,
  membersOfGroup,
  renameGroup,
} from '@/lib/group-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireGroupMember } from '@/lib/wire';

type GroupContext = { params: Promise<{ id: string }> };

/**
 * One group and everybody in it, in one request.
 *
 * The same shape as `GET /api/lists/{id}` and for the same reason: a group dialog is
 * opened cold, it cannot assume it already holds the member list, and the count on the
 * group row it was opened from would otherwise be a number from a different request
 * than the names beside it - which is the window `readableListSummary` exists to close
 * for a list.
 *
 * `GET /api/groups` remains the collection read and returns every group with its size.
 * This is the detail read, and the two are not interchangeable: `groupsForAccount` has
 * no per-group member rows and this has no group list, so a client that wanted both
 * would ask twice. The dialog wants both, so it asks once and gets one group.
 */
export const GET: (
  request: NextRequest,
  context: GroupContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    /*
      The membership read is the one that decides whether this account may see the group
      at all, so it gates the whole response rather than sitting beside a group row read
      that would have had to answer the same question. `membersOfGroup` carries the
      owner gate internally, which is why there is no group lookup here to authorize:
      the only reason this handler is not a route reaching past a `lib/` function is
      that it does not reach past one.
    */
    const members = await membersOfGroup(id, accountId);
    if (!members.ok) return refusalResponse(members.refusal);

    return NextResponse.json({ members: members.value.map(toWireGroupMember) });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { message: 'Failed to fetch group members' },
      { status: 500 }
    );
  }
};

export const PATCH: (
  request: NextRequest,
  context: GroupContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name } = await request.json();

    /*
      The same inline check `app/api/lists/route.ts:85-94` makes, and inline for the
      same reason: a blank name is a fact about the body that arrived, not a state in
      the world, and nothing in the closed vocabulary is the sentence for it.

      Read before the ownership gate, which is safe and worth being explicit about.
      The answer this returns is identical for every id in the product - a group that
      exists, a group that does not, and a group belonging to somebody else - so it
      distinguishes nothing about the target. The check that would *not* be safe in
      front of the gate is the duplicate one, because "you already have a group with
      that name" says something about the owner's other rows, and it is for exactly
      that reason that `renameGroup` runs its gate before it looks at the name
      (`lib/group-access.ts:368-372`).

      No `nothing_to_change` for a body that named no field, unlike
      `app/api/lists/[id]/route.ts:103-113`. That refusal is about a body that named
      neither or both of two *optional* fields, where the choice of what to change is
      genuinely ambiguous. This PATCH has exactly one field it can change, so a body
      without a name is an empty name and there is nothing else it could have meant.
    */
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { message: 'A group needs a name' },
        { status: 400 }
      );
    }

    const renamed = await renameGroup(id, accountId, name.trim());
    if (!renamed.ok) return refusalResponse(renamed.refusal);

    /*
      An acknowledgement and not the changed row, following
      `app/api/lists/[id]/route.ts:131-140` - but for a shorter reason than the one
      given there, because a `Group` has no holes in it: the list route refuses to
      echo a summary with missing counts, and this row would have all of its fields.

      The reason is that every field on it is either what the caller just sent or a
      number this operation cannot move. The name came in the request; `id` and
      `createdAt` are what the caller already had; `memberCount` is untouched by a
      rename, so it arrives at the client one round trip later than the truth and is
      therefore stale the moment somebody is added. The groups dialog re-reads the
      collection after any change (`types.ts:977`) and would overwrite it anyway.

      `renameGroup` returning the row is not the route declining to forward it.
      `StoredGroup` is the same shape `deleteGroup` below hands back, and a module
      that returns a row is describing what happened rather than prescribing an HTTP
      body. Which of those two this endpoint is for is decided where the response is
      written.
    */
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming group:', error);
    return NextResponse.json(
      { message: 'Failed to rename group' },
      { status: 500 }
    );
  }
};

export const DELETE: (
  request: NextRequest,
  context: GroupContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    /*
      The cascade is the schema's - memberships, and every list the group was shared
      with - and it is irreversible: nothing here is a second copy and a group
      re-created under the same name arrives empty, so the reach it had cannot be
      reconstructed from anything this product stores. That is why the confirmation
      states the consequence instead of asking whether the person is sure
      (`types.ts:602-611`), and it is why that confirmation is the client's: this
      route cannot ask, and a query parameter asking whether is not a confirmation.

      `{ success: true }` even though `deleteGroup` returns the row it read, and
      specifically because it returns that row rather than the row after the delete.
      Its `memberCount` is the number of people who just lost reach, which is the
      confirmation's input and not this response's output - re-read now it would be
      zero, a number about a group that no longer exists. The same argument as
      `DELETE /api/lists/{id}` (`app/api/lists/[id]/route.ts:184-189`): there is no
      second copy to describe.
    */
    const deleted = await deleteGroup(id, accountId);
    if (!deleted.ok) return refusalResponse(deleted.refusal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { message: 'Failed to delete group' },
      { status: 500 }
    );
  }
};