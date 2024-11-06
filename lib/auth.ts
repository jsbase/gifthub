import { AuthResponse, AuthVerifyResponse } from '@/types';

const isClient = typeof window !== 'undefined';

export async function login(groupName: string, password: string): Promise<AuthResponse> {
  if (!isClient) throw new Error('This method can only be used in the browser');
  
  // Get current language preference
  const lang = document.cookie.split('; ').find(row => row.startsWith('NEXT_LOCALE='))
    ?.split('=')[1] || 'en';

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupName, password }),
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
}

export async function register(groupName: string, password: string): Promise<AuthResponse> {
  if (!isClient) throw new Error('This method can only be used in the browser');
  
  if (!groupName || groupName.trim().length < 3) {
    throw new Error('Group name must be at least 3 characters long');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupName: groupName.trim(), password }),
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  return data;
}

export async function verifyAuth(): Promise<AuthVerifyResponse | null> {
  if (!isClient) return null;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Statt HEAD verwenden wir GET mit einem speziellen Header
    const response = await fetch('/api/auth/verify', {
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Silent-Auth': '1'  // Neuer Header für stille Authentifizierung
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && 
      (error.name === 'AbortError' || 
       error.message === 'Verification failed')) {
      return null;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth verification error:', error);
    }
    return null;
  }
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
