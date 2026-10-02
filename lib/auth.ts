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

export const login: (email: string, password: string) => Promise<AuthResponse> =
  async (email, password) => {
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
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
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

export const register: (
  email: string,
  password: string,
  displayName: string
) => Promise<AuthResponse> = async (email, password, displayName) => {
  if (!isClient) throw new Error('This method can only be used in the browser');

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, displayName }),
  });

  return response.json();
};