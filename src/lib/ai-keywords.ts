// src/lib/ai-keywords.ts
import { getAIKeywords, type AIKeyword } from '@/lib/db';

let keywordsCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get active keywords (with caching)
 */
export async function getActiveKeywords(): Promise<string[]> {
  const now = Date.now();

  if (keywordsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return keywordsCache;
  }

  const allKeywords = await getAIKeywords();
  keywordsCache = allKeywords
    .filter((k: AIKeyword) => k.is_active === 1)
    .map((k: AIKeyword) => k.keyword.toLowerCase());

  cacheTimestamp = now;
  return keywordsCache;
}

/**
 * Check if text contains any AI keyword
 */
export async function hasAIKeyword(text: string): Promise<boolean> {
  const keywords = await getActiveKeywords();
  const lowerText = text.toLowerCase();

  return keywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Invalidate keyword cache (call after CRUD operations)
 */
export function invalidateKeywordCache() {
  keywordsCache = null;
  cacheTimestamp = 0;
}
