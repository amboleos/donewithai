import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { BitbucketAPI } from '@/lib/git/bitbucket-provider';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const api = new BitbucketAPI(token);
    const url = 'https://bitbucket.org/efe_turhan/orthero5';

    console.log('[DEBUG] Calling provider.getBranches()...');
    const branches = await api.getBranches(url);
    console.log('[DEBUG] Provider returned', branches.length, 'branches');

    return NextResponse.json({
      total: branches.length,
      branches: branches.map(b => b.name).sort(),
    });
  } catch (error: any) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
