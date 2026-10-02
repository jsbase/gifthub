import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { requireGroupId } from '@/lib/auth-server';
import { acceptedMemberName } from '@/lib/member-name';

/*
  The alphabet, the normalisation and the two refusal codes all live in
  `lib/member-name`, which the client imports too. This route decides whether the
  name is taken; it no longer decides on its own what a name may be.
*/

/*
  No request parameter. The group comes from the session cookie, so this handler
  has nothing to read off the request - it used to accept one and pass it to the
  auth helper, which never opened it.
*/
export const GET: () => Promise<NextResponse> = async () => {
  try {
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const members = await prisma.userGroup.findMany({
      where: {
        groupId: groupId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: member.user.name,
      joinedAt: member.joinedAt.toISOString(),
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { message: 'Failed to fetch members' },
      { status: 500 }
    );
  }
};

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    /*
      `acceptedMemberName` normalises, tests, and hands back the value to store,
      so the name that is de-duplicated below and written at the end is the same
      one that passed the test. It used to be done in three steps here, which is
      three chances to store a different string than the one validated.
    */
    const normalizedName = acceptedMemberName(name);

    if (normalizedName === undefined) {
      return NextResponse.json(
        {
          message:
            'Invalid name format. Names may contain letters from any alphabet, marks, numbers, spaces, dots, hyphens and apostrophes, up to 100 characters.',
          code: 'invalid_name_format',
        },
        { status: 400 }
      );
    }

    // Check if a member with this name already exists in this specific group
    const existingMember = await prisma.userGroup.findFirst({
      where: {
        group: { id: groupId },
        user: { name: normalizedName },
      },
    });

    if (existingMember) {
      // `code` for the same reason the format 400 above has one: both are 400
      // with a `message`, and without a discriminator the client cannot tell
      // "that is not a name" from "that name is taken" - which are two
      // different sentences in the user's language, and the more common of the
      // two by some distance. Named to match `invalid_name_format` in shape,
      // and about the name rather than the member, because the message is
      // about the name. Additive; `message` and the status are unchanged.
      return NextResponse.json(
        {
          message: 'A member with this name already exists in this group',
          code: 'duplicate_name',
        },
        { status: 400 }
      );
    }

    // Always create a new user (removed upsert)
    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        password: hashedPassword,
      },
    });

    const userGroup = await prisma.userGroup.create({
      data: {
        userId: user.id,
        groupId,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: userGroup.id,
        name: user.name,
        joinedAt: userGroup.joinedAt,
      },
    });
  } catch (error) {
    console.error('Detailed error in POST /api/members:', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Failed to add member',
        success: false,
      },
      { status: 500 }
    );
  }
};
