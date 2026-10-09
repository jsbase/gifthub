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
 *
 * `status` rides along for the caller's classification, and it is the reason the
 * sheet can say more than one thing. `fetch` only rejects on a transport failure,
 * so a 401, a 400 and a 500 arrive here as three ordinary returns, and they are
 * three different problems: the route deliberately answers "no such account" and
 * "wrong password" with the same 401 (see `app/api/auth/login/route.ts`, where
 * doing so is what keeps the sign-in from being an account-existence oracle), so
 * the status cannot separate *those* - and it does not need to, because one
 * sentence is the honest answer to both. What it does separate is a refusal from a
 * server that broke, and that is the difference between "try again in a moment" and
 * "these two values did not sign you in". A caller that saw only `success: false`
 * could not tell them apart and had to answer both with the same sentence.
 */
export interface LoginResult {
  success: boolean;
  /**
   * The response's HTTP status, read off the response rather than derived from
   * `success`. `success` folds in the body's own claim as well as the status, so
   * it cannot tell a fault from a refusal - both of those arrive as `false`, and
   * they are exactly the two cases that need different sentences.
   */
  status: number;
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
 *
 * The one thing this still throws on is a response it cannot read: a transport
 * failure, where nothing arrived at all, or a body that is not the JSON below. Both
 * give up the status on the way out, deliberately - the caller's table sends "never
 * sent" and "not JSON" to the same sentence, and that sentence promises a retry,
 * which is the one thing both of them can honestly offer.
 *
 * It does drop a 5xx whose body is an HTML error page onto that sentence too, which
 * the table would rather have called a server fault. The route only ever answers in
 * JSON, so that body can only have come from a gateway between here and there, and
 * "please try again" - the whole of `loginOffline` - remains true of it.
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

  /*
    A body that is not JSON is thrown, not swallowed.

    It used to be `.catch(() => null)`, which turns an HTML page from a proxy or a
    captive portal into a well-formed answer carrying no code - and the caller, which
    classifies by status, then reads the 200 that arrived with it as a refusal. That
    is the one sentence in this product which must never be printed without cause, so
    a response this cannot read goes down the same path as a request that never left,
    where the caller has an honest sentence waiting.

    The cast claims no more than the code guarantees: a body that is the JSON literal
    `null` parses and then throws on the first property read below, which lands in
    the same place. There is no optional chaining here for that reason.

    A 2xx is unaffected. The route's success response is `{ success: true }`,
    and it is the only 2xx the route sends - there is no empty-but-successful answer
    to break.
  */
  const body = (await response.json().catch(() => {
    throw new Error('Login response was not JSON');
  })) as {
    success?: boolean;
    message?: string;
    code?: unknown;
  };

  return {
    success: response.ok && body.success === true,
    status: response.status,
    message: body.message,
    code: body.code,
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