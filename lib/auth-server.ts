import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

/**
 * The group this request is acting for, or `null` if there is no session.
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
 * The JWT identifies a *group*, not a person: there is no per-member identity in
 * this product, so nothing downstream should be asking for one.
 */
export const requireGroupId = async (): Promise<string | null> => {
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

    const groupName = verified.payload.groupName as string;
    const group = await prisma.group.findUnique({
      where: { name: groupName },
    });

    return group?.id ?? null;
  } catch {
    return null;
  }
};