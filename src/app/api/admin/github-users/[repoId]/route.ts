import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { getGithubUsersByRepo, getMappingsByRepo } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  // Verify admin
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { repoId } = await params;
  const githubUsers = await getGithubUsersByRepo(parseInt(repoId));
  const mappings = await getMappingsByRepo(parseInt(repoId));
  const mappedUsernames = new Set(mappings.map((m) => m.github_username.toLowerCase()));

  const unmapped = githubUsers.filter((u) => !mappedUsernames.has(u.toLowerCase()));

  return NextResponse.json({
    unmapped,
    mapped: mappings,
  });
}
