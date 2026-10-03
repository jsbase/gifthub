import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

/**
 * The account this request is acting as, or `null` if there is no session.
 *
 * One implementation, two questions asked of it: `requireAccountId` wants the id to
 * authorize by, `requireAccount` wants the same row as the header needs it. They
 * were written as two functions with the cookie read, the signature verified, the
 * payload checked and the row fetched written out twice, differing only in the
 * `select`. That is the duplication that matters in this file - not forty repeated
 * lines, but forty repeated lines that are the *definition of a valid session*.
 * A change to how the token is read - a new cookie name, a rotation, a key from
 * the environment - has one place to be made now, and had two.
 */

/**
 * Read and verify the session cookie, or `null`.
 *
 * A verified token naming an account that no longer exists resolves to `null`, not
 * to an id: the session is worthless without the row, and returning the id would
 * push a not-found from every downstream query instead of from here.
 *
 * The payload carries an id, not a name. It used to carry `groupName` and look the
 * group up by it on every request, which was a lookup on every route to learn
 * something the token already said, and a way to return no session at all if the
 * name changed between signing and reading. The id cannot be edited from outside,
 * so the lookup is gone and the failure mode goes with it.
 */
const sessionAccountId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    const accountId = verified.payload.accountId as string;

    return typeof accountId === 'string' && accountId.length > 0
      ? accountId
      : null;
  } catch {
    // Expired, tampered with, or signed by a different secret. All three are the
    // same answer from here, and none of them is worth logging per request.
    return null;
  }
};

/**
 * The account id, or `null`.
 *
 * The return type is a two-way union. It was three-way once, because `group?.id`
 * was spread into the same signature as the two explicit `null` returns, and every
 * caller had to collapse the `undefined` arm by hand.
 */
export const requireAccountId = async (): Promise<string | null> => {
  const accountId = await sessionAccountId();
  if (!accountId) return null;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true },
  });

  return account?.id ?? null;
};

/** The signed-in account as the header needs it: the id, the address and the name. */
export type SessionAccount = { id: string; email: string; displayName: string };

/**
 * The whole row, or `null`.
 *
 * `PRODUCT.md:72` makes the display name substitution a brand commitment, so the
 * name is read on nearly every authenticated render - and it is read here rather
 * than than in the client, because the cookie is httpOnly and the browser cannot
 * be the one to supply it.
 */
export const requireAccount = async (): Promise<SessionAccount | null> => {
  const accountId = await sessionAccountId();
  if (!accountId) return null;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, displayName: true },
  });

  return account ?? null;
};