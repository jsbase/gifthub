import { NextRequest, NextResponse } from 'next/server';
import { requireGroupId } from '@/lib/auth-server';
import { addGift, listGifts } from '@/lib/gift-write';

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gifts = await listGifts(groupId, searchParams.get('memberId'));

    return NextResponse.json({ gifts });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gifts' },
      { status: 500 }
    );
  }
};

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    const groupId = await requireGroupId();
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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

    const gift = await addGift(
      {
        title: title.trim(),
        description: description?.trim(),
        url: url?.trim(),
        forMemberId,
      },
      groupId
    );

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