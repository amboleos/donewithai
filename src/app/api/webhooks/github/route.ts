import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRepoByUrl, upsertCommit, upsertBranch, updateRepoLastSynced, updateCommitAIDetection } from '@/lib/db';
import { GitHubAPI } from '@/lib/github';
import { AIDetector } from '@/lib/ai-detector';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await req.text();
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  try {
    if (payload.ref && payload.commits) {
      // Push event - process new commits
      const repoUrl = payload.repository?.html_url || payload.repository?.url;
      if (!repoUrl) {
        return NextResponse.json({ error: 'No repo URL' }, { status: 400 });
      }

      // Get repo from DB
      const repos = await getRepoByUrl(repoUrl);
      if (!repos || repos.length === 0) {
        return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
      }

      const repo = repos[0];
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
      }

      const github = new GitHubAPI(githubToken);
      const detector = new AIDetector(process.env.ANTHROPIC_API_KEY);

      // Process commits
      for (const commit of payload.commits) {
        if (commit.id && commit.message && commit.author) {
          const dbCommit = await upsertCommit(
            repo.id,
            commit.id,
            commit.message,
            commit.author.username || commit.author.name,
            commit.author.email || null,
            new Date(commit.timestamp),
            commit.added?.length || 0,
            commit.removed?.length || 0
          );

          // Run AI detection
          const detection = await detector.detectWithLLM(commit.message, 'commit');
          if (detection.confidence > 0.6) {
            await updateCommitAIDetection(dbCommit.id, detection.isAI, detection.confidence);
          }
        }
      }

      await updateRepoLastSynced(repo.id);
    }

    if (payload.ref_type === 'branch') {
      // Branch created event
      const repoUrl = payload.repository?.html_url;
      if (!repoUrl) {
        return NextResponse.json({ error: 'No repo URL' }, { status: 400 });
      }

      const repos = await getRepoByUrl(repoUrl);
      if (!repos || repos.length === 0) {
        return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
      }

      const repo = repos[0];
      const branchName = payload.ref;

      await upsertBranch(
        repo.id,
        branchName,
        payload.sender?.login || 'unknown',
        new Date()
      );

      await updateRepoLastSynced(repo.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
