import { jwtVerify } from 'jose';

const isClient = typeof window !== 'undefined';

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function login(groupName: string, password: string): Promise<AuthResponse> {
  if (!isClient) throw new Error('This method can only be used in the browser');
  
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