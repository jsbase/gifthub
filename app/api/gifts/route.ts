import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGroupIdFromToken } from '@/lib/auth-server';

export const GET: (request: NextRequest) => Promise<NextResponse> = async request => {
  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    const gifts = await prisma.gift.findMany({
      where: {
        groupId,
        ...(memberId ? { forMemberId: memberId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ gifts });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gifts' },
      { status: 500 }
    );
  }
};

export const POST: (request: NextRequest) => Promise<NextResponse> = async request => {
  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, description, url, forMemberId } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'Gift title is required' },
        { status: 400 }
      );
    }

    if (!forMemberId) {
      return NextResponse.json(
        { message: 'Member ID is required' },
        { status: 400 }
      );
    }

    const gift = await prisma.gift.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        url: url?.trim(),
        groupId,
        forMemberId,
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
};
