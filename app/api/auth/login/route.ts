import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { findAccountByEmail } from '@/lib/list-access';
import { acceptedEmail } from '@/lib/email';
import { defaultLocale, locales } from '@/lib/i18n-config';
import type { LanguageCode } from '@/types';

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    const { email, password } = await request.json();

    if (typeof email !== 'string' || typeof password !== 'string' || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    /*
      Normalised before the lookup rather than after it, so the address that is
      compared is the address that is stored. Signing in with the capital letters a
      phone keyboard supplies has to find the account that registered in lower case;
      a comparison against the typed string would hand back "no such account" for
      a person who has, in fact, an account.
    */
    const normalizedEmail = acceptedEmail(email);
    if (normalizedEmail === undefined) {
      return NextResponse.json(
        { message: 'That is not an email address', code: 'invalid_email' },
        { status: 400 }
      );
    }

    const account = await findAccountByEmail(normalizedEmail);

    /*
      One answer for "no such address" and "wrong password", and it is 401 in both
      cases. The status is the same, the sentence is the same, and the work is the
      same - the missing-account branch compares against a hash nobody has, so both
      paths pay a full bcrypt verification and the response time says nothing either.

      This was 404 for an unknown address and 401 for a bad password, kept that way
      on the argument that `no_such_account` is a real outcome the share dialog has
      to be able to word. That argument does not hold here: the share dialog gets
      that outcome from `POST /api/lists/[id]/access`, which asks a different
      question of a different endpoint, and it is the owner asking about a person
      they already know. Nothing at sign-in needs to know the difference.

      What the pair did disclose is whether an address is registered. This product's
      users are one family, so that answer is "does my aunt use this", and it costs
      nothing to stop giving it away to anyone who types. It also removes a
      credential-stuffing oracle from a sign-in path that has no rate limit, an
      eight-character minimum and no recovery flow - the three properties that make
      a distinct answer worth not having.

      The constant-time compare is the reason the two branches do not diverge
      earlier. Returning before `bcrypt.compare` on a miss makes the response time
      say the same thing the status used to, which is to keep telling it twice.
    */
    const DUMMY_HASH =
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

    const isValid = await bcrypt.compare(
      password,
      account?.password ?? DUMMY_HASH
    );

    if (!account || !isValid) {
      return NextResponse.json(
        { message: 'Email or password is not correct' },
        { status: 401 }
      );
    }

    /*
      An id, not a name. The group token carried `groupName` and every request
      re-queried the group by it, which meant a rename between signing in and
      reading returned no session at all - indistinguishable from being signed out,
      which is the one diagnosis a signed-in person cannot act on.
    */
    const token = await new SignJWT({ accountId: account.id })
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

    /*
      Carried over from the group login unchanged, and still earning its place: a
      person who has never chosen a language arrives on the default locale, and the
      `NEXT_LOCALE` cookie is what every later page and every API string is read
      from. It is set only when absent, so signing in on a phone that has already
      been switched to Russian does not drag the whole session back to German.

      The header is read rather than a locale parameter, because the sign-in sheet
      sends no locale and this is the one request where there is no localized page
      in front of the person to have set the cookie already.
    */
    const acceptLanguage = request.headers.get('accept-language') || '';
    const preferredLocale = acceptLanguage
      .split(',')[0]
      .split('-')[0] as LanguageCode;
    const validLocales = locales;
    const locale = validLocales.includes(preferredLocale)
      ? preferredLocale
      : defaultLocale;
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
        details:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
};
