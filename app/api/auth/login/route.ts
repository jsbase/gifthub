import { NextResponse, NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { defaultLocale, locales } from '@/lib/i18n-config';
import { LanguageCode } from '@/types';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
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

    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const acceptLanguage = request.headers.get('accept-language') || '';
    const preferredLocale = acceptLanguage.split(',')[0].split('-')[0] as LanguageCode;
    const validLocales = locales;
    const locale = validLocales.includes(preferredLocale) ? preferredLocale : defaultLocale;
    const cookieStore = await cookies();

    if (!cookieStore.get('NEXT_LOCALE')) {
      response.cookies.set({
        name: 'NEXT_LOCALE',
        value: locale,
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
};
