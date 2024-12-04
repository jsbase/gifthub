import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGroupIdFromToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { id } = await request.json();

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const gift = await prisma.gift.findFirst({
      where: {
        id,
        groupId,
      },
    });

    if (!gift) {
      return NextResponse.json({ message: 'Gift not found' }, { status: 404 });
    }

    return NextResponse.json(gift);
  } catch (error) {
    console.error('Error fetching gift:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gift' },
      { status: 500 }
    );
  }
};

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { id } = await request.json();

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { message: 'Invalid gift data' },
        { status: 400 }
      );
    }

    const gift = await prisma.gift.update({
      where: {
        id,
        groupId,
      },
      data: {
        ...data,
        groupId,
      },
    });

    return NextResponse.json(gift);
  } catch (error) {
    console.error('Error updating gift:', error);
    return NextResponse.json(
      { message: 'Failed to update gift' },
      { status: 500 }
    );
  }
};

export const DELETE: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').pop();

  if (!id) {
    return NextResponse.json(
      { message: 'Gift ID is required' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const gift = await prisma.gift.findFirst({
      where: {
        id,
        groupId,
      },
    });

    if (!gift) {
      return NextResponse.json({ message: 'Gift not found' }, { status: 404 });
    }

    await prisma.gift.delete({
      where: {
        id,
        groupId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Gift deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting gift:', error);
    return NextResponse.json(
      { message: 'Failed to delete gift' },
      { status: 500 }
    );
  }
};

export const PUT: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { id } = await request.json();

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const gift = await prisma.gift.findFirst({
      where: {
        id,
        groupId,
      },
    });

    if (!gift) {
      return NextResponse.json({ message: 'Gift not found' }, { status: 404 });
    }

    const updatedGift = await prisma.gift.update({
      where: {
        id,
        groupId,
      },
      data: { isPurchased: !gift.isPurchased },
    });

    return NextResponse.json({
      success: true,
      gift: updatedGift,
    });
  } catch (error) {
    console.error('Error updating gift:', error);
    return NextResponse.json(
      { message: 'Failed to update gift' },
      { status: 500 }
    );
  }
};
