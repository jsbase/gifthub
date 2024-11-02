import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode('your-secret-key');

interface Group {
  groupName: string;
  password: string;
  members: any[];
  gifts: any[];
}

export async function login(groupName: string, password: string) {
  try {
    // In a real app, this would be a server call
    const storedGroups = JSON.parse(localStorage.getItem('groups') || '[]');
    const group = storedGroups.find((g: Group) => g.groupName === groupName);
    
    if (!group) {
      throw new Error('Group not found');
    }

    const isValid = await bcrypt.compare(password, group.password);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    const token = await new SignJWT({ groupName })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    localStorage.setItem('auth-token', token);
    return { success: true };
  } catch (error) {
    throw error;
  }
}

export async function register(groupName: string, password: string) {
  try {
    const storedGroups = JSON.parse(localStorage.getItem('groups') || '[]');
    
    if (storedGroups.some((g: Group) => g.groupName === groupName)) {
      throw new Error('Group already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newGroup = {
      groupName,
      password: hashedPassword,
      members: [],
      gifts: [],
      createdAt: new Date().toISOString(),
    };

    storedGroups.push(newGroup);
    localStorage.setItem('groups', JSON.stringify(storedGroups));
    
    return { success: true };
  } catch (error) {
    throw error;
  }
}

export async function verifyAuth() {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function logout() {
  localStorage.removeItem('auth-token');
}