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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const gift = await prisma.gift.findFirst({
      where: {
        id: params.id,
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
      where: { id: params.id },
      data: { isPurchased: !gift.isPurchased },
    });

    return NextResponse.json({
      success: true,
      gift: updatedGift,
    });
  } catch (error) {
    console.error('Error toggling gift status:', error);
    return NextResponse.json(
      { message: 'Failed to update gift status' },
      { status: 500 }
    );
  }
}