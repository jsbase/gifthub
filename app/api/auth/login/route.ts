import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { findAccountByEmail } from '@/lib/list-access';
import { acceptedEmail } from '@/lib/email';
import { acceptedNickname } from '@/lib/nickname';
import { cookieIsSecure } from '@/lib/cookie';
import { refusalResponse } from '@/lib/api-refusal';
import { defaultLocale, locales } from '@/lib/i18n-config';
import type { LanguageCode } from '@/types';
import type { Prisma } from '@prisma/client';

/**
 * Whether an identifier is a shape this product accepts at all.
 *
 * Split from the lookup on purpose, because the two failures must not look alike:
 * a malformed field is a fact about the request and gets its own sentence, while
 * "no such account" and "wrong password" stay a single uniform 401. That split is
 * what lets the client say "that is not a nickname or an address" without saying
 * anything about whether anybody is registered - a refusal about the *shape* of what
 * you typed reveals nothing about the world, and that is the only thing sign-in is
 * allowed to distinguish.
 */
const identifierIsWellFormed = (identifier: string): boolean =>
  identifier.includes('@')
    ? acceptedEmail(identifier) !== undefined
    : acceptedNickname(identifier) !== undefined;

/**
 * The account a sign-in identifier names, or `null`.
 *
 * Exactly one, or none. A nickname and an email address are both unique in the
 * database, so there is no third answer and no need to ask the person which of two
 * accounts they meant. That was the reason for adding the nickname at all: sign-in
 * originally accepted a *display* name, which cannot be unique because two people
 * are both called Anna, and the way out of that was to give people a unique handle
 * rather than to make their names unique - see `lib/nickname.ts`.
 *
 * An `@` chooses the lookup rather than trying both, because a nickname cannot
 * contain one. The two input spaces do not overlap and there is nothing to
 * disambiguate, so a field that tried both would be slower and would have two ways
 * to fail for one reason.
 *
 * The nickname comparison is case-insensitive, which it has to be: nicknames are
 * stored lowercased, so an exact comparison would fail every capitalised attempt.
 */
const loginIdentifierMatches = async (
  identifier: string
): Promise<Prisma.AccountGetPayload<Record<string, never>> | null> => {
  const trimmed = identifier.trim();

  if (trimmed.includes('@')) {
    const email = acceptedEmail(trimmed);
    return email === undefined ? null : findAccountByEmail(email);
  }

  const nickname = acceptedNickname(trimmed);
  if (nickname === undefined) return null;

  return prisma.account.findUnique({ where: { nickname } });
};

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    const { identifier, password } = await request.json();

    if (
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      !password
    ) {
      return NextResponse.json(
        { message: 'Name or email, and a password, are required' },
        { status: 400 }
      );
    }

    /*
One field, two kinds of answer: a nickname, or an email address.

      Which one it is decided by the presence of an `@`. That is a heuristic and it
      is the right one here, because `acceptedNickname` does not permit `@` in a
      nickname at all - so the two sets cannot overlap, and nothing has to be guessed
      about which lookup to run. A field that had to try both would be slower and
      could not say which failure it was.
    */

    /*
      The shape of the field, before anything is looked up.

      This is the only place on this route that says which part of what you typed was
      wrong, and it is safe precisely because it is about the *request* rather than
      the world: "that is not a nickname or an email address" is a fact about a
      string the caller already knows. Existence stays a uniform 401 below, so
      nothing here reveals whether anybody is registered.
    */
    if (!identifierIsWellFormed(identifier)) {
      return refusalResponse('invalid_identifier');
    }

    const account = await loginIdentifierMatches(identifier);

    /*
      One answer for "no such account" and "wrong password", and it is 401 in both
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
        { message: 'Nickname, email address or password is not correct' },
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
      secure: cookieIsSecure(request),
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
