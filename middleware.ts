import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import acceptLanguage from 'accept-language';
import { locales, defaultLocale } from '@/lib/i18n-config';
import { LanguageCode } from '@/types';

const getLocale = (request: NextRequest): LanguageCode => {
  // First priority: Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie?.value && locales.includes(localeCookie.value as LanguageCode)) {
    return localeCookie.value as LanguageCode;
  }

  // Second priority: Check browser's accept-language header
  acceptLanguage.languages([...locales]);
  return (acceptLanguage.get(request.headers.get('accept-language')) || defaultLocale) as LanguageCode;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/api/') ||
    pathname.includes('.') || // This will match all files with extensions
    pathname.endsWith('.webmanifest') // Handle all webmanifest files
  ) {
    return NextResponse.next();
  }

  // Check if this is a language switch
  const isLanguageSwitch = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`)
  );

  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token');

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token.value, secret);

      // If this is a language switch and auth is valid, allow it
      if (isLanguageSwitch) {
        return NextResponse.next();
      }
    } catch {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Check if the current path has a locale
  const matchedLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (matchedLocale) {
    // Always update the cookie when there's a locale in the URL
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

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
}

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
