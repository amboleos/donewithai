import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { repoId } = await req.json();

  if (!repoId) {
    return NextResponse.json({ error: 'repoId required' }, { status: 400 });
  }

  // Delete all branches for this repo
  const { client } = await import('@/lib/db');
  await client.execute({
    sql: `DELETE FROM branches WHERE repo_id = ?`,
    args: [parseInt(repoId)],
  });

  return NextResponse.json({ success: true, message: `Cleared all branches for repo ${repoId}` });
}
