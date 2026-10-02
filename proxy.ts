import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import acceptLanguage from 'accept-language';
import { locales, defaultLocale, hasLocaleInPath } from '@/lib/i18n-config';
import type { LanguageCode } from '@/types';

const getLocale: (request: NextRequest) => LanguageCode = (request) => {
  // First priority: Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (
    localeCookie?.value &&
    locales.includes(localeCookie.value as LanguageCode)
  ) {
    return localeCookie.value as LanguageCode;
  }

  // Second priority: Check browser's accept-language header
  acceptLanguage.languages([...locales] as LanguageCode[]);
  return (acceptLanguage.get(request.headers.get('accept-language')) ||
    defaultLocale) as LanguageCode;
};

export const proxy: (
  request: NextRequest
) => Promise<NextResponse> = async (request) => {
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

  /*
    The dashboard is `app/[lang]/dashboard/page.tsx`, so the only path that
    exists is `/{locale}/dashboard`. This used to test
    `pathname.startsWith('/dashboard')`, which no real request can ever
    satisfy: `proxy.ts` below redirects `/dashboard` to `/de/dashboard`
    before it could ever be served, so the token check here never ran and the
    localized dashboard reached the network unguarded. Matching against the
    `locales` list keeps the three languages in one place instead of
    duplicating them in a regex.

    The client is not a backstop either: `verifyAuth()` in `lib/auth.ts`
    resolves to an object on every path, including `{ success: false }`, so
    the `if (!auth)` check in the dashboard's `init()` is never true. An
    unauthenticated visitor used to get the loading spinner for as long as
    they cared to wait, rather than being sent back to the landing page.
  */
  const isDashboard =
    pathname === '/dashboard' ||
    locales.some(
      (locale) =>
        pathname === `/${locale}/dashboard` ||
        pathname.startsWith(`/${locale}/dashboard/`)
    );

  if (isDashboard) {
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

  // TODO:Check why this is not working even if this is the same function
  // const matchedLocale = getLocaleFromPath(pathname);

  // Check if the current path has a locale
  const matchedLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
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

  if (hasLocale) {
    return NextResponse.next();
  }

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
    '/:path*',
  ],
};
