import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES } from '@/lib/db';
import { createUserMapping, client } from '@/lib/db';

// GET - List all mappings
export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await client.execute({
      sql: `
        SELECT um.*, u.name as user_name, u.email as user_email
        FROM user_mappings um
        JOIN users u ON um.user_id = u.id
        ORDER BY um.repo_id, um.github_username
      `,
    });
    return NextResponse.json({ mappings: result.rows });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get mappings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  // Support both snake_case (API convention) and camelCase (JS convention)
  const repoId = body.repo_id ?? body.repoId;
  const githubUsername = body.github_username ?? body.githubUsername;
  const userId = body.user_id ?? body.userId;

  // Validate required fields
  if (!repoId || !githubUsername || !userId) {
    return NextResponse.json(
      { error: 'repo_id, github_username, and user_id are required' },
      { status: 400 }
    );
  }

  try {
    const mapping = await createUserMapping(
      parseInt(repoId),
      githubUsername,
      parseInt(userId)
    );
    return NextResponse.json({ mapping });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create mapping' },
      { status: 500 }
    );
  }
}
