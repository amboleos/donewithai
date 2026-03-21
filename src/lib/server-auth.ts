// src/lib/server-auth.ts
import { verifyToken } from '@/lib/simple-auth';
import { getUserById } from '@/lib/db';
import type { PublicUser } from '@/lib/db';

export interface Session {
  user: PublicUser & { role: string };
}

export async function getServerSession(req?: { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<Session | null> {
  if (!req) return null;

  const token = req.cookies.get('auth_token')?.value;
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
    },
  };
}
