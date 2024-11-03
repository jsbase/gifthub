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
            email: true,
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
      email: member.user.email,
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

    console.log('Received POST request for adding member');

    const body = await request.json();
    const { email } = body;

    console.log('Received email:', email);

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    const existingMember = await prisma.userGroup.findFirst({
      where: {
        group: { id: groupId },
        user: { email: email },
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
      where: { email },
      update: {},
      create: {
        email,
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
        email: user.email,
        joinedAt: userGroup.joinedAt,
      },
    });
  } catch (error) {
    console.error('Detailed error in POST /api/members:', error);

    if (error instanceof Error) {
      if (error.message.includes('P2002')) {
        return NextResponse.json(
          { message: 'User is already a member of this group' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to add member' },
      { status: 500 }
    );
  }
}