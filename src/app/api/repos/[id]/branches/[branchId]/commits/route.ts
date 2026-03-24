import { NextRequest, NextResponse } from 'next/server';
import { getCommitsForBranch } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const commits = await getCommitsForBranch(parseInt(branchId));
    return NextResponse.json({ commits });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
