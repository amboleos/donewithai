import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { getAllUsers } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}
