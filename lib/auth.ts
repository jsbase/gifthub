import type {
  AuthResponse,
  AuthVerifyResponse,
} from '@/types';

const isClient = typeof window !== 'undefined';

export const verifyAuth: (silent?: boolean) => Promise<AuthVerifyResponse> = async (silent = false) => {
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
};

export const login: (groupName: string, password: string) => Promise<AuthResponse> = async (groupName, password) => {
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

export const register: (groupName: string, password: string) => Promise<AuthResponse> = async (groupName, password) => {
  if (!isClient) throw new Error('This method can only be used in the browser');

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupName, password }),
  });

  return response.json();
};
