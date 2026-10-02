import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

/**
 * The account this request is acting as, or `null` if there is no session.
 *
 * This is the one place that answers it. Ten route handlers used to ask, each
 * spelling the same `if (!groupId) → 401` rule, and the signature took a
 * `Request` it never read - the body reads the cookie off `next/headers` instead,
 * so every one of those handlers built a request object to pass into a parameter
 * that was thrown away.
 *
 * The return type is a two-way union now. It was three-way, because `group?.id`
 * was spread into the same signature as the two explicit `null` returns, and
 * every caller had to collapse the `undefined` arm by hand.
 *
 * The payload carries an id, not a name. It used to carry `groupName` and look
 * the group up by it on every request, which was a lookup on every route to learn
 * something the token already said, and a way to return no session at all if the
 * name changed between signing and reading. The id cannot be edited from outside,
 * so the lookup is gone and the failure mode goes with it.
 *
 * A verified token naming an account that no longer exists resolves to `null`,
 * not to an id: the session is worthless without the row, and returning the id
 * would push a not-found from every downstream query instead of from here.
 */
export const requireAccountId = async (): Promise<string | null> => {
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
    if (typeof accountId !== 'string' || accountId.length === 0) {
      return null;
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    return account?.id ?? null;
  } catch {
    return null;
  }
};

/**
 * The signed-in account as the header needs it: the id to authorize by, and the
 * name to put in place of the wordmark.
 *
 * `PRODUCT.md:72` makes that substitution a brand commitment, so the name is read
 * on nearly every authenticated render and it is read here rather than in the
 * client - the cookie is httpOnly, so the browser cannot be the one to supply it.
 */
export type SessionAccount = { id: string; email: string; displayName: string };

export const requireAccount = async (): Promise<SessionAccount | null> => {
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
    if (typeof accountId !== 'string' || accountId.length === 0) {
      return null;
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, email: true, displayName: true },
    });

    return account ?? null;
  } catch {
    return null;
  }
};