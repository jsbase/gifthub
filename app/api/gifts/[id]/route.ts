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

export async function GET(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = context.params;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

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
        id: id,
        groupId,
      },
    });

    if (!gift) {
      return NextResponse.json(
        { message: 'Gift not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(gift);
  } catch (error) {
    console.error('Error fetching gift:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gift' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = context.params;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
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
        id: id,
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
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = context.params;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the gift belongs to the group
    const gift = await prisma.gift.findFirst({
      where: {
        id: id,
        groupId,
      },
    });

    if (!gift) {
      return NextResponse.json(
        { message: 'Gift not found' },
        { status: 404 }
      );
    }

    await prisma.gift.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gift:', error);
    return NextResponse.json(
      { message: 'Failed to delete gift' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the gift belongs to the group
    const gift = await prisma.gift.findFirst({
      where: {
        id: id,
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
        id: id,
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
}