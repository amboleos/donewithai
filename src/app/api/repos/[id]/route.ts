import { NextRequest, NextResponse } from 'next/server';
import { getRepoById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repoId = parseInt(id);
    const repo = await getRepoById(repoId);

    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    return NextResponse.json({ repo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
