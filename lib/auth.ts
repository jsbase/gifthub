import type {
  AuthResponse,
  AuthVerifyResponse,
} from '@/types';

const isClient = typeof window !== 'undefined';

export async function verifyAuth(silent: boolean = false): Promise<AuthVerifyResponse> {
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
      groupName: data.groupName
    };
  } catch (error) {
    return { success: false };
  }
}

export async function login(groupName: string, password: string): Promise<AuthResponse> {
  if (!isClient) throw new Error('This method can only be used in the browser');

  const lang = document.cookie.split('; ').find(row => row.startsWith('NEXT_LOCALE='))
    ?.split('=')[1] || 'en';

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
    body: JSON.stringify({ groupName, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
}

export async function logout() {
  if (!isClient) return;

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function register(groupName: string, password: string): Promise<AuthResponse> {
  if (!isClient) throw new Error('This method can only be used in the browser');

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupName, password }),
  });

  return response.json();
}
