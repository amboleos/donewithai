import { NextRequest, NextResponse } from 'next/server';
import { getBranchesByRepo } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repoId = parseInt(id);
    const branches = await getBranchesByRepo(repoId);

    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
