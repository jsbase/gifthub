import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function getGroupIdFromToken(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    const groupName = verified.payload.groupName as string;
    const group = await prisma.group.findUnique({
      where: { name: groupName }
    });

    return group?.id;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
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

    // Transform the data to match your Member interface
    const formattedMembers = members.map(member => ({
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
}

export async function POST(request: Request) {
  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Validate name format
    const nameRegex = /^[a-zA-Z0-9\s.\-]+$/;
    if (!name || !nameRegex.test(name)) {
      return NextResponse.json(
        { message: 'Invalid name format. Only letters, numbers, spaces, dots, and hyphens are allowed.' },
        { status: 400 }
      );
    }

    const existingMember = await prisma.userGroup.findFirst({
      where: {
        group: { id: groupId },
        user: { name: name },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { message: 'User is already a member of this group' },
        { status: 400 }
      );
    }

    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    const user = await prisma.user.upsert({
      where: { name },
      update: {},
      create: {
        name,
        password: hashedPassword,
      },
    }).catch((error) => {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw new Error('A user with this name already exists');
      }
      throw error;
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
        message: error instanceof Error ? error.message : 'Failed to add member',
        success: false 
      },
      { status: error instanceof Error && error.message.includes('already exists') ? 400 : 500 }
    );
  }
}
