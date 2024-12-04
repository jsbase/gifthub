import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGroupIdFromToken } from '@/lib/auth-server';

export const DELETE: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { pathname } = new URL(request.url);
  const id = pathname.split('/').pop();

  if (!id) {
    return NextResponse.json(
      { message: 'Member ID is required' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userGroup = await prisma.userGroup.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!userGroup) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 }
      );
    }

    await prisma.gift.deleteMany({
      where: {
        forMemberId: id,
        groupId,
      },
    });

    await prisma.userGroup.delete({
      where: {
        id,
        groupId,
      },
    });

    await prisma.user.delete({
      where: {
        id: userGroup.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member and associated data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { message: 'Failed to delete member' },
      { status: 500 }
    );
  }
};
