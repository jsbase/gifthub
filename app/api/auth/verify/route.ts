import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const GET: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  const isSilentAuth = request.headers.get('X-Silent-Auth') === '1';

  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false },
        { status: isSilentAuth ? 200 : 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    return NextResponse.json({
      groupName: verified.payload.groupName,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: isSilentAuth ? 200 : 401 }
    );
  }
};
