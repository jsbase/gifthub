import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import acceptLanguage from 'accept-language';
import { locales, defaultLocale, hasLocaleInPath } from '@/lib/i18n-config';
import type { LanguageCode } from '@/types';

/**
 * The localized sections a session is required for.
 *
 * Both of them render private data: the contents page names the lists you own and
 * the lists other people have shared with you, and a sheet is the whole of one
 * person's gift ideas. Neither can be rendered without a session, so neither is
 * worth rendering at all for somebody who has not got one - and the check is here
 * rather than in the page so that it runs before the request reaches the server
 * component that would query the database and then decide.
 */
const GATED_SECTIONS = ['dashboard', 'list'] as const;

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
    The gated sections are `app/[lang]/dashboard/page.tsx` and
    `app/[lang]/list/[id]/page.tsx`, so the only paths that exist are
    `/{locale}/dashboard` and `/{locale}/list/...`. This used to test
    `pathname.startsWith('/dashboard')`, which no real request can ever
    satisfy: `proxy.ts` below redirects `/dashboard` to `/de/dashboard`
    before it could ever be served, so the token check here never ran and the
    localized dashboard reached the network unguarded. Matching against the
    `locales` list keeps the three languages in one place instead of
    duplicating them in a regex.

    The exact match and the `startsWith` are both needed. `/de/list` does not
    exist as a page today - the sheet is always `/{locale}/list/{id}` - and it is
    matched anyway so that a new page under that segment cannot be added without
    the gate noticing that it needs the gate. The unprefixed forms are matched
    too, for the same reason the localized ones are: they are the paths this
    handler itself redirects, so they are the ones that must be checked before
    the redirect rather than after it.

    The client is not a backstop either: `verifyAuth()` in `lib/auth.ts`
    resolves to an object on every path, including `{ success: false }`, so
    the `if (!auth)` check in the dashboard's `init()` is never true. An
    unauthenticated visitor used to get the loading spinner for as long as
    they cared to wait, rather than being sent back to the landing page.
  */
  const needsSession = GATED_SECTIONS.some(
    (section) =>
      pathname === `/${section}` ||
      locales.some(
        (locale) =>
          pathname === `/${locale}/${section}` ||
          pathname.startsWith(`/${locale}/${section}/`)
      )
  );

  if (needsSession) {
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
  /*
    The two gated sections are named here as they always were for the dashboard, so
    that the set of paths the gate covers can be read without following the logic
    above. Both are already covered by the catch-alls below and would run the gate
    with or without these two lines - they are there so the file states the same
    thing twice on purpose rather than by accident.
  */
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/list',
    '/list/:path*',
    '/:locale',
    '/:locale/:path*',
    '/:path*',
  ],
};
