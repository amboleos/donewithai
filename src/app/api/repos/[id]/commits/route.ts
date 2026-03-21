import { NextRequest, NextResponse } from 'next/server';
import { getCommitsByRepo } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repoId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const commits = await getCommitsByRepo(repoId, limit);

    return NextResponse.json({ commits });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
