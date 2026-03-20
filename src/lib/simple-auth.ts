import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  created_at: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Get token from request
export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Get token from cookie (for client-side)
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(^|;)\\s*auth_token\\s*=\\s*([^;]+)/);
  return match ? match[2] : null;
}

// Set auth cookie
export function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; sameSite=lax`;
}

// Clear auth cookie
export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'auth_token=; path=/; max-age=0';
}
