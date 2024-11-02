import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
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
    console.error('Token verification error:', error);
    return NextResponse.json(
      { message: 'Invalid token' },
      { status: 401 }
    );
  }
} 