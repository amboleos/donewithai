import { NextRequest, NextResponse } from 'next/server';
import { getRepos, createRepo, deleteRepo } from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName } from '@/lib/git';
import type { GitProviderType } from '@/types';

export async function GET() {
  try {
    const repos = await getRepos();
    return NextResponse.json({ repos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Parse URL to detect provider
    let parsed;
    try {
      parsed = parseRepoUrl(url);
    } catch (e) {
      return NextResponse.json(
        { error: 'Unsupported git provider. Use GitHub or Bitbucket URL' },
        { status: 400 }
      );
    }

    // Check if repo already exists
    const existingRepos = await getRepos();
    const existing = existingRepos.find((r) => r.url === url);
    if (existing) {
      return NextResponse.json({ repo: existing }, { status: 200 });
    }

    // Verify we can access the repo
    try {
      const provider = createProvider(url);
      await provider.getRepoInfo(url);
    } catch (error: any) {
      if (error.message?.includes('Environment variable')) {
        // For Bitbucket, allow creating the repo even if token is missing
        // The sync will fail later with a clear error
      } else {
        throw error;
      }
    }

    const tokenEnvVar = getEnvVarName(parsed.name, parsed.provider);

    const repo = await createRepo(
      parsed.name,
      url,
      parsed.owner,
      parsed.provider,
      tokenEnvVar
    );

    return NextResponse.json({ repo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await deleteRepo(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
