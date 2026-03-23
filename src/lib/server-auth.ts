// src/lib/server-auth.ts
import { verifyToken } from '@/lib/simple-auth';
import { getUserById } from '@/lib/db';
import type { PublicUser } from '@/lib/db';

export interface Session {
  user: PublicUser & { role: string };
}

// Helper to extract token from either cookie or Authorization header
function extractToken(req: { cookies: { get: (name: string) => { value: string } | undefined }, headers: { get: (name: string) => string | null } }): string | null {
  // First try cookie
  const cookieToken = req.cookies.get('auth_token')?.value;
  if (cookieToken) return cookieToken;

  // Then try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

export async function getServerSession(req?: { cookies: { get: (name: string) => { value: string } | undefined }, headers: { get: (name: string) => string | null } }): Promise<Session | null> {
  if (!req) return null;

  const token = extractToken(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.userId);
  if (!user) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      github_username: user.github_username,
      role: user.role || 'developer',
      created_at: user.created_at,
    },
  };
}
