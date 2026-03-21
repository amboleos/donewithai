import { NextRequest, NextResponse } from 'next/server';
import { getRepoAnalytics, getDeveloperStats } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repoId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const [analytics, developerStats] = await Promise.all([
      getRepoAnalytics(repoId, days),
      getDeveloperStats(repoId),
    ]);

    return NextResponse.json({ analytics, developerStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
