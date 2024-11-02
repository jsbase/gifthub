import { jwtVerify } from 'jose';

const isClient = typeof window !== 'undefined';

export async function login(groupName: string, password: string) {
  if (!isClient) throw new Error('This method can only be used in the browser');
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupName, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return { success: true };
}

export async function register(groupName: string, password: string) {
  if (!isClient) throw new Error('This method can only be used in the browser');
  
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ groupName, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return { success: true };
}

export async function verifyAuth() {
  if (!isClient) return null;
  
  try {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include',
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Auth verification error:', error);
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