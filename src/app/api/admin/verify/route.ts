import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ isAdmin: false }, { status: 403 });
  }

  return NextResponse.json({ isAdmin: true });
}
