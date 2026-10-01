import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getGroupIdFromToken } from '@/lib/auth-server';

// Unicode-aware on purpose: de/en/ru are equally first-class per PRODUCT.md and
// de is the default locale, so `\p{L}\p{M}` is what real names are made of. Do not
// "simplify" this back to ASCII. Anchoring the class is also what rejects
// zero-width and other invisible characters: they are neither letters nor marks.
const MEMBER_NAME_REGEX = /^(?=[^\p{L}]*\p{L})[\p{L}\p{M}\p{N} .\-'’]{1,100}$/u;

/**
 * Pasted text arrives with the wrong space and the wrong hyphen. Rewriting them
 * is the point, not accepting them: a name carrying `U+00A0` and the same name
 * typed plainly have to be the same member, or the duplicate check below stops
 * recognising them and the list grows a second row that looks identical.
 *
 * Only these two are rewritten. The genuinely invisible characters - `U+200B`,
 * `U+200D`, `U+FEFF`, `U+2028`, `U+2029` - stay rejected: they make two
 * *different* names render identically, which is a support problem rather than
 * a formatting one, and no amount of normalising recovers what was typed.
 */
const normalizeMemberName = (name: string): string =>
  name.replace(/\u00A0/g, ' ').replace(/\u2011/g, '-');

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    const groupId = await getGroupIdFromToken(request);
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
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    // Normalize before validating and before every use below. The name that is
    // tested, de-duplicated and stored is the same value, so a pasted U+00A0
    // cannot slip past the test and then sit in the database as a second,
    // visually identical member.
    const normalizedName =
      typeof name === 'string' ? normalizeMemberName(name) : name;

    if (!name || !MEMBER_NAME_REGEX.test(normalizedName)) {
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
