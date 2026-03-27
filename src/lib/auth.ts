import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';

const SALT_ROUNDS = 12;
const TOKEN_COOKIE_NAME = 'session_token';

// User type without password hash
export type SafeUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  videosCount: number;
  likesCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
};

// Exclude password hash from user object
export function excludePassword(user: {
  passwordHash: string | null;
  [key: string]: unknown;
}): Omit<typeof user, 'passwordHash'> {
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password against hash
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate a simple session token
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Set session cookie
export async function setSessionCookie(token: string, userId: string): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  cookieStore.set(TOKEN_COOKIE_NAME, `${userId}:${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  });
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(TOKEN_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return null;
    }
    
    const [userId] = sessionCookie.value.split(':');
    
    if (!userId) {
      return null;
    }
    
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return null;
    }
    
    return excludePassword(user) as SafeUser;
  } catch {
    return null;
  }
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate username format (alphanumeric, underscores, 3-20 chars)
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// Validate password strength (min 6 chars)
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
