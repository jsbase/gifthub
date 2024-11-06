import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import acceptLanguage from 'accept-language';

const locales = ['en', 'de', 'ru'];
const defaultLocale = 'de';

function getLocale(request: NextRequest): string {
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  if (localeCookie?.value && locales.includes(localeCookie.value)) {
    return localeCookie.value;
  }

  acceptLanguage.languages(locales);
  return acceptLanguage.get(request.headers.get('accept-language')) || defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token.value, secret);
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
    '/((?!_next|api|flags|assets|.*\\.(?:ico|png|webmanifest)).*)'
  ]
};
