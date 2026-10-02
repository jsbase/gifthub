import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireGroupId } from '@/lib/auth-server';

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
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /*
      Scoped by the group, like every other handler. It used to look the row up by
      id alone: another group's membership was therefore found, the gift delete
      below correctly refused to reach across, and the membership delete then
      threw on the `groupId` filter and surfaced as a 500 - which told a caller
      that the id exists in some group, where every other handler would have
      answered 404 and told them nothing.
    */
    const userGroup = await prisma.userGroup.findFirst({
      where: { id, groupId },
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
