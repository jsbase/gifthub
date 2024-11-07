import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { defaultLocale } from '@/lib/i18n-config';

export async function POST(request: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    const { groupName, password } = await request.json();

    if (!groupName || !password) {
      return NextResponse.json(
        { message: 'Group name and password are required' },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { name: groupName }
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(password, group.password);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid password' },
        { status: 401 }
      );
    }

    const token = await new SignJWT({ groupName: group.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const response = NextResponse.json({ token, success: true });

    // Set the token as an HTTP-only cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Set default locale cookie if it doesn't exist
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE');
    if (!locale) {
      response.cookies.set({
        name: 'NEXT_LOCALE',
        value: defaultLocale,
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
      });
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        message: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
