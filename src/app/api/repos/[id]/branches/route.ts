import { NextRequest, NextResponse } from 'next/server';
import { getBranchesByRepo, getBranchesWithStatsByRepo } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repoId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const withStats = searchParams.get('stats') === 'true';

    if (withStats) {
      const branches = await getBranchesWithStatsByRepo(repoId);
      return NextResponse.json({ branches });
    } else {
      const branches = await getBranchesByRepo(repoId);
      return NextResponse.json({ branches });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
