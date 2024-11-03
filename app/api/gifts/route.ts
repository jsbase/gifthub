import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';

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

    const gifts = await prisma.gift.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ gifts });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gifts' },
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

    const { title, description, url } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'Gift title is required' },
        { status: 400 }
      );
    }

    const gift = await prisma.gift.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        url: url?.trim(),
        groupId,
      },
    });

    return NextResponse.json({
      success: true,
      gift,
    });
  } catch (error) {
    console.error('Error adding gift:', error);
    return NextResponse.json(
      { message: 'Failed to add gift' },
      { status: 500 }
    );
  }
}