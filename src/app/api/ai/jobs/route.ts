import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES, getAIJobs, getAIJobsReport } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId');
  const period = searchParams.get('period');
  const userId = searchParams.get('userId');
  const report = searchParams.get('report') === 'true';

  try {
    if (report && period) {
      // Get aggregated report
      const data = await getAIJobsReport(period);
      return NextResponse.json(data);
    }

    // Get filtered job list
    const jobs = await getAIJobs({
      repoId: repoId ? parseInt(repoId) : undefined,
      period: period || undefined,
      userId: userId ? parseInt(userId) : undefined,
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
