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

    // Validate name format
    if (!name || !MEMBER_NAME_REGEX.test(name)) {
      return NextResponse.json(
        {
          message:
            'Invalid name format. Only letters, numbers, spaces, dots, and hyphens are allowed.',
        },
        { status: 400 }
      );
    }

    // Check if a member with this name already exists in this specific group
    const existingMember = await prisma.userGroup.findFirst({
      where: {
        group: { id: groupId },
        user: { name: name },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { message: 'A member with this name already exists in this group' },
        { status: 400 }
      );
    }

    // Always create a new user (removed upsert)
    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: {
        name,
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
