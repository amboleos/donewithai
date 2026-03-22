import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const token = searchParams.get('token');

  if (!url || !token) {
    return NextResponse.json({ error: 'url and token required' }, { status: 400 });
  }

  // Parse workspace and repo from URL
  const match = url.match(/bitbucket\.org[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid Bitbucket URL' }, { status: 400 });
  }

  const workspace = match[1];
  const repoSlug = match[2];

  const results: any[] = [];
  let apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches?pagelen=100`;
  let pageCount = 0;

  while (apiUrl && pageCount < 10) {
    pageCount++;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();

    results.push({
      page: pageCount,
      url: apiUrl,
      count: data.values?.length || 0,
      next: data.next || null,
      branchNames: data.values?.map((b: any) => b.name) || [],
    });

    apiUrl = data.next;
    if (!apiUrl) break;
  }

  return NextResponse.json({
    workspace,
    repoSlug,
    totalBranches: results.reduce((sum, r) => sum + r.count, 0),
    pages: results,
  });
}
