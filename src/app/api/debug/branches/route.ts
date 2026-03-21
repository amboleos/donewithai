import { NextRequest, NextResponse } from 'next/server';
import { getBranchesByRepo } from '@/lib/db';
import { getServerSession } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId');

  if (!repoId) {
    return NextResponse.json({ error: 'repoId required' }, { status: 400 });
  }

  const branches = await getBranchesByRepo(parseInt(repoId));

  return NextResponse.json({
    total: branches.length,
    branches: branches.map(b => ({ name: b.name, id: b.id }))
  });
}
