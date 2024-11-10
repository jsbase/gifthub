import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGroupIdFromToken } from '@/lib/auth-server';

export async function DELETE(
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

    const { id } = await params;

    // Get the UserGroup entry to find the associated userId
    const userGroup = await prisma.userGroup.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!userGroup) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 }
      );
    }

    // Delete in this order to maintain referential integrity:
    // 1. First delete all gifts associated with the member
    await prisma.gift.deleteMany({
      where: {
        forMemberId: id,
        groupId,
      },
    });

    // 2. Delete the member's group association
    await prisma.userGroup.delete({
      where: {
        id,
        groupId,
      },
    });

    // 3. Delete the user (since users are independent per group)
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
}
