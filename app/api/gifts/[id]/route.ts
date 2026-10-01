import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getGroupIdFromToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// Gift ids are Prisma cuids (e.g. "clx0a1b2c3d4e5f6g7h8i9j0k1").
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const isValidId = (value: unknown): value is string =>
  typeof value === 'string' && ID_PATTERN.test(value);

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const { id } = await request.json();

  if (!isValidId(id)) {
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
  // Read the body once. Reading it a second time throws "Body is unusable",
  // and spreading the parsed object would let a caller rewrite `forMemberId`
  // or `id` — so pick the editable fields out explicitly.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid gift data' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ message: 'Invalid gift data' }, { status: 400 });
  }

  const { id, title, description, url, isPurchased } = body as Record<
    string,
    unknown
  >;

  if (!isValidId(id)) {
    return NextResponse.json(
      { message: 'Invalid gift ID format' },
      { status: 400 }
    );
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json(
      { message: 'A gift needs a title' },
      { status: 400 }
    );
  }

  try {
    const groupId = await getGroupIdFromToken(request);
    if (!groupId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Absent means "leave alone"; present-but-empty means "clear it". Checking
    // `in` keeps those two apart - sending only a title must not wipe the
    // description and url the gift already had. An empty string is treated as
    // empty rather than stored, so both nullable columns hold null or text.
    const data: Prisma.GiftUpdateInput = { title: title.trim() };
    if ('description' in body) {
      data.description =
        typeof description === 'string' && description.length > 0
          ? description
          : null;
    }
    if ('url' in body) {
      data.url = typeof url === 'string' && url.length > 0 ? url : null;
    }
    if (typeof isPurchased === 'boolean') {
      data.isPurchased = isPurchased;
    }

    const gift = await prisma.gift.update({
      where: {
        id,
        groupId,
      },
      data,
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

  if (!isValidId(id)) {
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
