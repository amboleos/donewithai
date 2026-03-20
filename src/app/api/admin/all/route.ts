import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';
import { verifyToken } from '@/lib/simple-auth';

export async function GET(req: NextRequest) {
  // Verify admin
  let token = req.cookies.get('auth_token')?.value;

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch all commits with repo info
    const commitsResult = await client.execute({
      sql: `
        SELECT
          c.id,
          c.sha,
          c.message,
          c.author,
          c.repo_id,
          c.is_ai_detected,
          r.name as repo_name
        FROM commits c
        JOIN repos r ON c.repo_id = r.id
        ORDER BY c.date DESC
        LIMIT ?
      `,
      args: [limit],
    });

    // Fetch all branches with repo info
    const branchesResult = await client.execute({
      sql: `
        SELECT
          b.id,
          b.name,
          b.repo_id,
          b.is_ai_detected,
          r.name as repo_name
        FROM branches b
        JOIN repos r ON b.repo_id = r.id
        ORDER BY b.created_at DESC
        LIMIT ?
      `,
      args: [limit],
    });

    return NextResponse.json({
      commits: commitsResult.rows,
      branches: branchesResult.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
