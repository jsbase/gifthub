import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGroupIdFromToken } from '@/lib/auth-server';

export async function PUT(
  request: Request,
) {
  try {
    const { id } = await request.json();
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const gift = await prisma.gift.findFirst({
      where: {
        id,
        groupId,
      },
    });

    if (!gift) {
      return NextResponse.json(
        { message: 'Gift not found' },
        { status: 404 }
      );
    }

    const updatedGift = await prisma.gift.update({
      where: { 
        id,
        groupId,
      },
      data: { isPurchased: !gift.isPurchased },
    });

    return NextResponse.json({ isPurchased: updatedGift.isPurchased });
  } catch (error) {
    console.error('Error toggling gift status:', error);
    return NextResponse.json(
      { message: 'Failed to update gift status' },
      { status: 500 }
    );
  }
}
