import OpenAI from 'openai';
import {
  enqueueForAIDetection,
  acquireQueueItem,
  markQueueCompleted,
  markQueueFailed,
  incrementQueueRetry,
  getPendingQueueItems,
  createAIJob,
  getCommitsByRepo,
  cleanupOldQueueItems,
  getCommitsByBranchId,
} from '@/lib/db';
import { getPeriod, calculatePoints, resolveUserId } from './ai-jobs';
import type { AIDetectionQueue, Commit } from '@/lib/db';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

export class AIQueueProcessor {
  private client: OpenAI | null = null;
  private isProcessing = false;

  constructor() {
    const apiKey = process.env.ZAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.z.ai/api/coding/paas/v4',
      });
    }
  }

  /**
   * Process multiple queue items with 1-second delay between LLM calls
   */
  async processBatch(items: Array<AIDetectionQueue & { message?: string; author?: string; sha?: string }>): Promise<number> {
    let processed = 0;

    for (const item of items) {
      const success = await this.processItem(item);
      if (success) {
        processed++;
      }

      // 1-second delay between LLM requests (rate limiting per spec)
      if (processed < items.length) {
        await this.sleep(1000);
      }
    }

    return processed;
  }

  /**
   * Process a single queue item with LLM detection
   */
  async processItem(item: AIDetectionQueue & { message?: string; branch_name?: string; author?: string; sha?: string }): Promise<boolean> {
    // Acquire lock
    const locked = await acquireQueueItem(item.id);
    if (!locked) {
      console.log(`[Queue] Item ${item.id} already being processed`);
      return false;
    }

    try {
      // Determine text for LLM detection
      const text = item.commit_id ? (item.message || '') : (item.branch_name || '');
      const type = item.commit_id ? 'commit' : 'branch';

      const isAI = await this.detectWithLLM(text, type);

      if (!isAI) {
        await markQueueCompleted(item.id);
        console.log(`[Queue] Item ${item.id} not AI, skipped`);
        return true;
      }

      // Create AI job
      if (item.commit_id) {
        await this.createJobForCommit(item.commit_id, item.repo_id);
      } else if (item.branch_id) {
        await this.createJobForBranch(item.branch_id, item.repo_id);
      }

      await markQueueCompleted(item.id);
      console.log(`[Queue] Item ${item.id} completed, AI job created`);
      return true;

    } catch (error: any) {
      console.error(`[Queue] Item ${item.id} failed:`, error.message);

      if (item.retry_count < MAX_RETRIES) {
        await incrementQueueRetry(item.id);
        await this.sleep(RETRY_DELAYS[item.retry_count]);
        // Re-queue by returning false
        return false;
      } else {
        await markQueueFailed(item.id, error.message);
        return true;
      }
    }
  }

  /**
   * Detect AI using z.ai LLM API
   */
  private async detectWithLLM(text: string, type: 'commit' | 'branch'): Promise<boolean> {
    if (!this.client) {
      // No API key, use conservative default (not AI)
      return false;
    }

    const prompt = type === 'commit'
      ? `Analyze this commit message and determine if it was AI-generated or written by a human. Reply with JSON: {"isAI": boolean}. Commit: "${text}"`
      : `Analyze this branch name and determine if it was AI-generated or created by a human. Reply with JSON: {"isAI": boolean}. Branch: "${text}"`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'glm-4.6',
        messages: [
          {
            role: 'system',
            content: 'You are an AI detection assistant. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      // GLM-4.6 uses reasoning_content field for reasoning models
      const message = response.choices[0]?.message as any;
      const content = message?.content || message?.reasoning_content || '';

      if (content) {
        // Look for our specific JSON format - avoids incomplete JSON from reasoning
        const match = content.match(/\{\s*"isAI"\s*:\s*(true|false)\s*,\s*"confidence"\s*:\s*[\d.]+\s*,\s*"reason"\s*:\s*"[^"]*"\s*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            return parsed.isAI === true;
          } catch (e) {
            console.warn('[Queue] JSON matched but failed to parse');
          }
        }
      }
    } catch (error) {
      console.error('[Queue] z.ai LLM API call failed:', error);
    }

    return false;
  }

  /**
   * Create AI job for commit
   */
  private async createJobForCommit(commitId: number, repoId: number) {
    const commits = await getCommitsByRepo(repoId, 10000);
    const commit = commits.find(c => c.id === commitId);
    if (!commit) return;

    const points = calculatePoints(commit.lines_added, commit.lines_removed);
    if (points < 1) return;

    const commitDate = new Date(commit.date);
    const userId = await resolveUserId(repoId, commit.author);

    await createAIJob(
      repoId,
      userId,
      getPeriod(commitDate),
      'commit',
      commitId,
      points,
      'llm',
      commitDate.toISOString()
    );
  }

  /**
   * Create AI job for branch (aggregates all commits)
   */
  private async createJobForBranch(branchId: number, repoId: number) {
    // Use the branch_commits junction table to get all commits for this branch
    const branchCommits = await getCommitsByBranchId(branchId);

    if (branchCommits.length === 0) return;

    const totalLinesAdded = branchCommits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
    const totalLinesRemoved = branchCommits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);
    const points = calculatePoints(totalLinesAdded, totalLinesRemoved);

    if (points < 1) return;

    const userId = await resolveUserId(repoId, branchCommits[0].author);

    await createAIJob(
      repoId,
      userId,
      getPeriod(new Date()),
      'branch',
      branchId,
      points,
      'llm',
      new Date().toISOString()
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old queue items
   */
  async cleanup() {
    await cleanupOldQueueItems();
  }
}
