import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';
import { verifyToken } from '@/lib/simple-auth';

export async function GET(req: NextRequest) {
  // Verify authenticated user (any role can read)
  let token = req.cookies.get('auth_token')?.value;

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  const payload = verifyToken(token || '');
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Only show 2026+ data
    const AI_CUTOFF_DATE = '2026-01-01T00:00:00.000Z';

    // Fetch all commits with repo info and is_ai_detected (2026+ only)
    const commitsResult = await client.execute({
      sql: `
        SELECT
          c.id,
          c.sha,
          c.message,
          c.author,
          c.repo_id,
          c.date,
          c.lines_added,
          c.lines_removed,
          r.name as repo_name,
          c.is_ai_detected
        FROM commits c
        JOIN repos r ON c.repo_id = r.id
        WHERE c.date >= ?
        ORDER BY c.date DESC
      `,
      args: [AI_CUTOFF_DATE],
    });

    // Fetch all branches with repo info and is_ai_detected (only branches with 2026+ commits)
    const branchesResult = await client.execute({
      sql: `
        SELECT DISTINCT
          b.id,
          b.name,
          b.repo_id,
          r.name as repo_name,
          b.is_ai_detected
        FROM branches b
        JOIN repos r ON b.repo_id = r.id
        JOIN branch_commits bc ON b.id = bc.branch_id
        JOIN commits c ON bc.commit_id = c.id
        WHERE c.date >= ?
        ORDER BY b.name
      `,
      args: [AI_CUTOFF_DATE],
    });

    return NextResponse.json({
      commits: commitsResult.rows,
      branches: branchesResult.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
