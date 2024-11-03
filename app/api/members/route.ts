import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';

// Add these interfaces for type safety
interface User {
  id: string;
  email: string;
}

interface UserGroup {
  id: string;
  joinedAt: Date;
  user: User;
}

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

    const userGroups = await prisma.userGroup.findMany({
      where: { groupId },
      include: { user: true }
    });

    const members = userGroups.map((ug: UserGroup) => ({
      id: ug.id,
      email: ug.user.email,
      joinedAt: ug.joinedAt
    }));

    return NextResponse.json({ members });
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

    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Create user if doesn't exist
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: '', // We'll implement proper user authentication later
      },
    });

    // Add user to group if not already a member
    const userGroup = await prisma.userGroup.create({
      data: {
        userId: user.id,
        groupId,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: userGroup.id,
        email: user.email,
        joinedAt: userGroup.joinedAt,
      },
    });
  } catch (error) {
    console.error('Error adding member:', error);

    if (error instanceof Error && error.message.includes('P2002')) {
      return NextResponse.json(
        { message: 'User is already a member of this group' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to add member' },
      { status: 500 }
    );
  }
}