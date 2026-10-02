import type { AuthResponse, AuthVerifyResponse } from '@/types';

const isClient = typeof window !== 'undefined';

/**
 * These are browser wrappers around the route handlers, and nothing more.
 *
 * Every one of them refuses to run outside the browser, because each of them reads
 * a cookie - the session is an httpOnly `auth-token` - and a server-side call
 * would either see no cookie at all or, worse, see the caller's and hand it
 * forward. That is not a style rule: the cookie cannot be read here in any case,
 * so the failure is loud on purpose rather than a confusing 401 later.
 */
export const verifyAuth: (
  silent?: boolean
) => Promise<AuthVerifyResponse> = async (silent = false) => {
  if (!isClient) throw new Error('This method can only be used in the browser');

  try {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include',
      headers: {
        'X-Silent-Auth': silent ? '1' : '0',
      },
    });

    const data = await response.json();
    return {
      success: data.success,
      email: data.email,
      displayName: data.displayName,
    };
  } catch {
    // No session, or the request never reached the server. Both answer "not signed
    // in", because from here they are the same state: there is nothing to retry and
    // nothing a person could do about it.
    return { success: false };
  }
};

/**
 * What a sign-in attempt came back with.
 *
 * `code` is `unknown` rather than `Refusal` on purpose, and this is the one type
 * that crosses the server boundary: the body is attacker-reachable JSON, so it is
 * `isRefusal` that decides what the string may be, at the call site, by comparison
 * against literals. Typing it as the union here would claim a guarantee the wire
 * does not make.
 */
export interface LoginResult {
  success: boolean;
  message?: string;
  code?: unknown;
}

/**
 * `identifier` is a nickname or an email address - both unique, so one field
 * resolves to at most one account. See `lib/nickname.ts`.
 *
 * **This does not throw on a refusal.** It used to, and that is why it now does
 * not: throwing discarded the response body, so every reason the server refused a
 * sign-in arrived at the caller as one indistinguishable `Error`, and the client
 * had to re-implement the rules it was trying to avoid duplicating - the shape
 * check before the request, and a guess at the sentence after it.
 *
 * Returning the body costs one `try` and gives back the refusal's `code`, so
 * `auth-buttons.tsx` switches on the same closed `Refusal` union the server
 * produced and the form says the thing the server meant. The client-side gate stays
 * where it is, because answering before the round trip is better than answering
 * after it - but it is now an optimisation rather than the only source of truth.
 */
export const login: (
  identifier: string,
  password: string
) => Promise<LoginResult> = async (identifier, password) => {
  if (!isClient) throw new Error('This method can only be used in the browser');

  const lang =
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] || 'en';

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
    body: JSON.stringify({ identifier, password }),
  });

  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    code?: unknown;
  } | null;

  return {
    success: response.ok && body?.success === true,
    message: body?.message,
    code: body?.code,
  };
};

export const logout: () => Promise<void> = async () => {
  if (!isClient) return;

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};

/**
 * `displayName` is not sent.
 *
 * It used to be the third argument, and now it is derived on the server from the
 * nickname and capitalised there. That is the whole reason registration still asks
 * for three fields: a display name the person types twice on the way to being shown
 * their own nickname back to them is a field that has to be explained, and this one
 * does not have to be explained at all.
 */
export const register: (
  email: string,
  password: string,
  nickname: string
) => Promise<AuthResponse> = async (email, password, nickname) => {
  if (!isClient) throw new Error('This method can only be used in the browser');

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, nickname }),
  });

  return response.json();
};