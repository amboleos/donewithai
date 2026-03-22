import { createClient } from '@libsql/client';
import OpenAI from 'openai';

// Inline AI detection logic
const aiPatterns = [
  /\b(co-pilot|copilot|ai-generated|ai assisted|ai assisted|llm|gpt|chatgpt|claude|gemini|openai)\b/i,
  /^(feat|fix|chore|docs|style|refactor|test|build)(\(.*\))?:?\s+[A-Z]/,
];

const aiKeywords = ['auto-claude', 'copilot', 'ai-generated', 'gpt', 'llm', 'claude', 'chatgpt', 'gemini', 'openai'];

async function hasAIKeyword(message) {
  const lower = message.toLowerCase();
  for (const keyword of aiKeywords) {
    if (lower.includes(keyword)) return true;
  }
  return false;
}

async function detectWithLLM(message, apiKey) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.z.ai/api/coding/paas/v4',
  });

  const prompt = `You are an expert at detecting AI-generated git commit messages.

Analyze this commit message and determine if it was likely written by:
1. AI tools (Copilot, ChatGPT, Claude, etc.) - mark as AI
2. A human developer - mark as human

Commit message: "${message}"

Consider these indicators:
- AI: Generic descriptions, conventional commits without context, perfect grammar, structured formats
- Human: Specific context, emotional language, typos, personal notes, "because/so that" explanations

Reply ONLY with valid JSON in this exact format: {"isAI": true/false, "confidence": 0.0-1.0, "reason": "short explanation"}`;

  try {
    const response = await client.chat.completions.create({
      model: 'glm-4.6',
      messages: [
        { role: 'system', content: 'You are an AI detection assistant. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    // GLM-4.6 may use reasoning_content field for reasoning models
    const message = response.choices[0]?.message;
    let content = message?.content || message?.reasoning_content || '';

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isAI: Boolean(parsed.isAI),
        confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.7)),
        reason: `z.ai GLM: ${parsed.reason || 'No explanation'}`,
      };
    }

    throw new Error('Could not parse LLM response as JSON');
  } catch (error) {
    console.error('LLM error:', error.message);
    throw error;
  }
}

async function detectFromCommitMessage(message, apiKey) {
  const trimmed = message.trim();

  // STEP 1: Check AI keywords first
  const hasKeyword = await hasAIKeyword(trimmed);
  if (hasKeyword) {
    return {
      isAI: true,
      confidence: 1.0,
      reason: 'Contains AI keyword',
    };
  }

  // STEP 2: Use LLM if available
  if (apiKey) {
    try {
      return await detectWithLLM(trimmed, apiKey);
    } catch (error) {
      console.warn('LLM detection failed, using pattern fallback');
    }
  }

  // STEP 3: Fallback to pattern matching
  let aiScore = 0;
  for (const pattern of aiPatterns) {
    if (pattern.test(trimmed)) {
      aiScore += 0.3;
    }
  }

  return {
    isAI: aiScore >= 0.3,
    confidence: 0.5,
    reason: 'Pattern-based detection',
  };
}

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.POSTGRES_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const AI_CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z');

async function testAIDetection() {
  console.log('Testing AI Detection System\n');
  console.log('==============================\n');

  // Get repos
  const reposResult = await client.execute(`SELECT id, name FROM repos LIMIT 1`);
  if (reposResult.rows.length === 0) {
    console.log('No repos found!');
    return;
  }

  const repo = reposResult.rows[0];
  console.log(`Testing on repo: ${repo.name} (ID: ${repo.id})\n`);

  // Get commits from 2026 that don't have AI detection yet
  const commits = await client.execute({
    sql: `
      SELECT id, sha, message, author, date
      FROM commits
      WHERE repo_id = ? AND date >= '2026-01-01' AND is_ai_detected IS NULL
      ORDER BY date DESC
      LIMIT 10
    `,
    args: [repo.id],
  });

  console.log(`Testing AI detection on ${commits.rows.length} sample commits:\n`);

  const zaiApiKey = process.env.ZAI_API_KEY;
  console.log(`LLM Available: ${zaiApiKey ? 'YES (z.ai GLM-4.6)' : 'NO (pattern fallback only)'}\n`);

  for (const commit of commits.rows) {
    const shortMsg = commit.message.substring(0, 60);
    const shortSha = commit.sha.substring(0, 8);

    console.log(`[${shortSha}] "${shortMsg}..."`);

    const detection = await detectFromCommitMessage(commit.message, zaiApiKey);
    console.log(`  → AI: ${detection.isAI} | Confidence: ${detection.confidence.toFixed(2)} | Reason: ${detection.reason}\n`);
  }

  // Also test some known AI patterns
  console.log('Testing known AI patterns:\n');

  const aiTestMessages = [
    'feat: add user authentication component',
    'fix: resolve memory leak in worker process',
    'chore: update dependencies to latest versions',
    'auto-claude: generated PR description',
    'Merge pull request #123 from feature/add-login',
  ];

  for (const msg of aiTestMessages) {
    const detection = await detectFromCommitMessage(msg, zaiApiKey);
    console.log(`"${msg}"`);
    console.log(`  → AI: ${detection.isAI} | Confidence: ${detection.confidence.toFixed(2)} | Reason: ${detection.reason}\n`);
  }
}

testAIDetection().catch(console.error);
