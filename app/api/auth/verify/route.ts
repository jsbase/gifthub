import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const isSilentAuth = request.headers.get('X-Silent-Auth') === '1';

    if (!token) {
      if (isSilentAuth) {
        return NextResponse.json({ success: false }, { status: 200 });
      }
      return NextResponse.json(
        { message: 'No token found' },
        { status: 401 }
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
      success: true
    });

  } catch (error) {
    if (request.headers.get('X-Silent-Auth') === '1') {
      return NextResponse.json({ success: false }, { status: 200 });
    }
    return NextResponse.json(
      { message: 'Invalid token' },
      { status: 401 }
    );
  }
}
