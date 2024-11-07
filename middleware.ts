import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import acceptLanguage from 'accept-language';
import { locales, defaultLocale, LanguageCode } from '@/lib/i18n-config';

function getLocale(request: NextRequest): LanguageCode {
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie?.value && locales.includes(localeCookie.value as LanguageCode)) {
    return localeCookie.value as LanguageCode;
  }

  acceptLanguage.languages([...locales]);
  return (acceptLanguage.get(request.headers.get('accept-language')) || defaultLocale) as LanguageCode;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    '/((?!_next|api|flags|assets|purchased.svg|.*\\.(?:ico|png|webmanifest)).*)'
  ]
};
