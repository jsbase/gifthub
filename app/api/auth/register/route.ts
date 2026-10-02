import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { findAccountByEmail } from '@/lib/list-access';
import { acceptedEmail } from '@/lib/email';
import {
  BCRYPT_COST,
  isPasswordLongEnough,
} from '@/lib/account-name';
import { acceptedNickname } from '@/lib/nickname';
import { refusalResponse } from '@/lib/api-refusal';
import { cookieIsSecure } from '@/lib/cookie';

/*
  Registration is the only place in this product that creates an account and the
  only place a password is written, so these four refusals are produced here rather
  than returned by `lib/list-access.ts`: they are all answers about the shape of the
  request, and there is no list yet for there to be refused access to. They are still
  `Refusal` values, and they go out through `lib/api-refusal.ts` like every other one,
  so a client switches on one vocabulary for the whole API rather than two.

  That file used to be spelled out again here, with its own copy of these four
  messages. Two copies of a sentence is how a client ends up rendering one refusal in
  two different ways depending on which route raised it.
*/

export const POST: (request: NextRequest) => Promise<NextResponse> = async (
  request
) => {
  /*
    Upper-cases the first character and leaves the rest alone.
   *
    Only the first character, deliberately. Splitting on a separator and joining with
    spaces would be cleverer and would be wrong: `anna.mueller` and `anna-mueller`
    are handles, and turning them into "Anna.Mueller" would invent a surname that
    nobody typed. The nickname is a handle first and a name second, and this is the
    one place the second is derived from the first.
   */
  const capitalize = (value: string): string =>
    value.charAt(0).toUpperCase() + value.slice(1);

  try {
    /*
      Both configuration values are checked before anything is written. The group
      route this replaces created the row first and discovered a missing
      `JWT_SECRET` while signing it, which left an account behind a 500 and a
      person who could not sign in to it - a failure the client cannot retry,
      because every retry after it is answered "that address is taken".
    */
    if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
      console.error('DATABASE_URL or JWT_SECRET is not set');
      return NextResponse.json(
        { success: false, message: 'Service configuration error' },
        { status: 503 }
      );
    }

    let email: unknown;
    let password: unknown;
    let nickname: unknown;

    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
      nickname = body.nickname;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    /*
      `acceptedEmail` normalises, tests, and hands back the value to store, so the
      address that is de-duplicated below and written at the end is the same string
      that passed the test. Normalising here rather than in the form is not
      belt-and-braces: a form can be bypassed, and a bare `@unique` in Postgres is
      case-sensitive, so an unnormalised `Anna@x.de` would become a second account
      that the first one can never be reached at.
    */
    const normalizedEmail = acceptedEmail(email);
    if (normalizedEmail === undefined) {
      return refusalResponse('invalid_email');
    }

    /*
      Eight characters and no composition rule. The rule lives in
      `lib/account-name.ts` with the reasoning for why it is the only one; the
      route does not get a second opinion. The `typeof` half is for the compiler -
      the helper is shared with the client form, which has no narrowing to do, so
      it answers a boolean rather than being a type guard.
    */
    if (typeof password !== 'string' || !isPasswordLongEnough(password)) {
      return refusalResponse('weak_password');
    }

/*
      The unique handle, and the one account-wide rule that moved into the schema to
      enforce it. A validator and a unique index would disagree under concurrency,
      so the index is the authority and this check exists only to say so in a
      sentence rather than in a database error. The catch below covers the race.
    */
    const normalizedNickname = acceptedNickname(nickname);
    if (normalizedNickname === undefined) {
      return refusalResponse('invalid_nickname');
    }

    if (await prisma.account.findUnique({
      where: { nickname: normalizedNickname },
    })) {
      return refusalResponse('duplicate_nickname');
    }

    /*
      The display name starts as the nickname rather than being asked for. Signing
      up is already three fields for someone who is not technical, and a fourth
      that says the same thing is the one that tips it over; the display name is
      theirs to change afterwards and until then a nickname is a perfectly good
      name to be called.

      Capitalised on the way through, so somebody who typed `anna` is greeted as
      "Anna" - the header substitution in `PRODUCT.md:72` is set in a serif and is
      the product's one piece of typography that is trying to be a name, and a
      lowercase handle is not one.
    */
    const displayName = capitalize(normalizedNickname);

    /*
      Checked through the same lookup the sign-in path uses, rather than a direct
      `prisma.account.findUnique`, so there is one place in the product that knows
      how an account is found by its address. The unique constraint is still the
      authority - the check exists to say so in a sentence rather than in a
      database error - and the catch below covers the race between the two.
    */
    if (await findAccountByEmail(normalizedEmail)) {
      return refusalResponse('duplicate_email');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    /*
      `select` rather than taking the row whole, so the password hash has no path
      out of this function even if a later edit reaches for it. The insert is
      direct Prisma because there is no `lib` function that creates an account -
      `lib/list-access.ts` owns list-scoped authorization, and account creation
      happens before there is a list to authorize.
    */
    const account = await prisma.account.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        nickname: normalizedNickname,
        displayName,
      },
      select: { id: true, email: true, nickname: true, displayName: true },
    });

    /*
      The payload is an id, not a name. The group token carried `groupName` and
      every request re-queried the group by it, which meant a rename between
      signing in and reading returned no session at all - a failure that looked
      like being signed out rather than like a stale token.
    */
    const token = await new SignJWT({ accountId: account.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const response = NextResponse.json({
      success: true,
      email: account.email,
      displayName: account.displayName,
    });

    /*
      Registering signs you in. The alternative - create the account and make the
      person type the same password again on the sign-in sheet - is a second thing
      to go wrong for a person who has only just been shown their own address.
    */
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: cookieIsSecure(request),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);

    /*
      The checks above and the unique constraints are not atomic, so two people
      registering `anna` at the same moment can both pass a check and one of them
      loses. `P2002` is that loss, and it has to answer with the same refusal the
      check would have - otherwise the person who lost the race is told
      "registration failed" for a field that is, correctly, taken.

      Tested on the error's `code`, not on its `message`. The message is a rendered
      sentence Prisma composes for a human reading a terminal, and the code is the
      part that is a contract - so matching on the message means this branch stops
      firing the day the wording changes, and the failure mode is the worst kind: an
      ordinary 500 on a route that has a correct answer ready for it.

      **Which** unique constraint is read off `meta.target`, because `P2002` alone
      does not say. There are three of them on this table - the address, the
      nickname and the primary key - and answering `duplicate_email` for a lost
      nickname race tells somebody their email address is taken when it is not, which
      sends them off to fix the field that was fine and leaves the one that was not.
      That is the exact failure `lib/nickname.ts` gives its codes separate identities
      to prevent, undone in the catch.

      `meta.target` is the column or index name as a string on some Prisma versions
      and an array on others, so both are handled and anything unrecognised falls
      through to the generic 500 rather than guessing. Guessing would be worse than
      the plain failure: a wrong sentence about a wrong field is the one error a
      person cannot work out on their own.
    */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target
        : typeof target === 'string'
          ? [target]
          : [];

      if (fields.some((field) => String(field).includes('nickname'))) {
        return refusalResponse('duplicate_nickname');
      }
      if (fields.some((field) => String(field).includes('email'))) {
        return refusalResponse('duplicate_email');
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Registration failed',
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
};
