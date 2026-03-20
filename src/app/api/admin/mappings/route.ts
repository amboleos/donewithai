import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { createUserMapping } from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { repoId, githubUsername, userId } = await req.json();

  try {
    const mapping = await createUserMapping(
      parseInt(repoId),
      githubUsername,
      parseInt(userId)
    );
    return NextResponse.json({ mapping });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create mapping' },
      { status: 500 }
    );
  }
}
