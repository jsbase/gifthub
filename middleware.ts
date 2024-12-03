import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import acceptLanguage from 'accept-language';
import { locales, defaultLocale, hasLocaleInPath } from '@/lib/i18n-config';
import type { LanguageCode } from '@/types';

const getLocale = (request: NextRequest): LanguageCode => {
  // First priority: Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie?.value && locales.includes(localeCookie.value as LanguageCode)) {
    return localeCookie.value as LanguageCode;
  }

  // Second priority: Check browser's accept-language header
  acceptLanguage.languages([...locales] as LanguageCode[]);
  return (acceptLanguage.get(request.headers.get('accept-language')) || defaultLocale) as LanguageCode;
};

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Skip section
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.includes('.') || // This will match all files with extensions
    pathname.endsWith('.webmanifest')
  ) {
    return NextResponse.next();
  }

  const hasLocale = hasLocaleInPath(pathname);

  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token');

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token.value, secret);

      if (hasLocale) {
        return NextResponse.next();
      }
    } catch {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // TODO: check why this is not working even if this is the same function
  // const matchedLocale = getLocaleFromPath(pathname);
  // Check if the current path has a locale
  const matchedLocale = locales.find(
    (locale: LanguageCode) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Always update the cookie when there's a locale in the URL
  if (matchedLocale) {
    const response = NextResponse.next();
    response.cookies.set({
      name: 'NEXT_LOCALE',
      value: matchedLocale,
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
    return response;
  }

  if (hasLocale) return NextResponse.next();

  const locale: LanguageCode = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
};

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/:locale',
    '/:locale/:path*',
    '/:path*'
  ]
};
