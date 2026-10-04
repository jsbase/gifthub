import { NextRequest, NextResponse } from 'next/server';
import { requireAccountId } from '@/lib/auth-server';
import { addMember } from '@/lib/group-access';
import { refusalResponse } from '@/lib/api-refusal';
import { toWireGroupMember } from '@/lib/wire';

type GroupContext = { params: Promise<{ id: string }> };

export const POST: (
  request: NextRequest,
  context: GroupContext
) => Promise<NextResponse> = async (request, { params }) => {
  try {
    const accountId = await requireAccountId();
    if (!accountId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { accountId: memberAccountId } = await request.json();

    /*
      An account id, and that is the whole argument for this route's shape. A person
      is named by something they typed - a nickname, an address - and turning that
      into an account is `GET /api/accounts/search`'s job; this route receives the
      result of that and does not guess. Accepting the string as well would put a
      second, looser way to resolve an account next to the first, and a half-typed
      address is a thing that matches somebody else's handle. `addMember` takes an id
      for the same reason (`lib/group-access.ts:448-452`): there is nowhere here for
      a name to be matched against.

      Renamed on the way out of the body because the two are different accounts:
      `accountId` in this handler is the owner, from the session, and
      `memberAccountId` is the person being put into their group. Naming the second
      one where it is read is what keeps the owner in the call below from looking
      like the new member.

      Inline, because a body that named nobody is a fact about the request rather
      than a state in the world - the same rule the blank-name checks apply at
      `app/api/lists/route.ts:85-94` and `app/api/groups/[id]/route.ts`.
    */
    if (
      typeof memberAccountId !== 'string' ||
      memberAccountId.length === 0
    ) {
      return NextResponse.json(
        { message: 'A group member is named by their account' },
        { status: 400 }
      );
    }

    /*
      Three arguments, named at the call site because the word `id` means three
      different things within four lines here. `addMember` takes the group, then the
      owner of that group, then the account to put into it
      (`lib/group-access.ts:468-472`), and the owner is the session's account: it
      arrives from `requireAccountId` and not from the request, so a caller cannot
      nominate somebody else as the owner whose gate then passes.

      Three refusals are reachable and all of them come from the module - never from
      a query in this file, which has none.
    */
    const added = await addMember(
      id, // the group
      accountId, // its owner, from the session
      memberAccountId // the account being added
    );
    if (!added.ok) return refusalResponse(added.refusal);

    return NextResponse.json({
      success: true,
      /*
        The member row, unlike the acknowledgement a rename returns, and the
        difference is `id`: this call mints a membership row, and that id is what a
        later `DELETE /api/groups/{id}/members/{memberId}` is addressed by. The
        picker resolved a person to an *account* id and cannot know the membership's.

        A 200 for somebody who was already a member is deliberate and is not to be
        turned into a refusal here. `addMember` answers with the existing row because
        the requested state is now the actual state - the caller asked for this
        person to be in this group, and they are - and because the closed vocabulary
        has no code for it: `already_shared` is a list grant, and
        `duplicate_group_name` is a name (`lib/group-access.ts:487-503`). Inventing
        one here would be a refusal the product cannot word.
      */
      member: toWireGroupMember(added.value),
    });
  } catch (error) {
    console.error('Error adding group member:', error);
    return NextResponse.json(
      { message: 'Failed to add group member' },
      { status: 500 }
    );
  }
};