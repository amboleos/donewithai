import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES } from '@/lib/db';
import { deleteMapping, client } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  // Support both snake_case and camelCase
  const githubUsername = body.github_username ?? body.githubUsername;

  if (!githubUsername) {
    return NextResponse.json(
      { error: 'github_username is required' },
      { status: 400 }
    );
  }

  try {
    const result = await client.execute({
      sql: `UPDATE user_mappings SET github_username = ? WHERE id = ? RETURNING *`,
      args: [githubUsername.toLowerCase(), parseInt(id)],
    });
    return NextResponse.json({ mapping: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await deleteMapping(parseInt(id));
  return NextResponse.json({ success: true });
}
