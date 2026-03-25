import OpenAI from 'openai';
import { hasAIKeyword } from '@/lib/ai-keywords';

// Fallback pattern-based detection (used only if LLM fails)
const aiPatterns = [
  /\b(co-pilot|copilot|ai-generated|ai assisted|ai assisted|llm|gpt|chatgpt|claude|gemini|openai)\b/i,
  /^(feat|fix|chore|docs|style|refactor|test|build)(\(.*\))?:?\s+[A-Z]/, // Conventional commits
  /^(Implement|Add|Create|Update|Fix|Remove|Delete)\s+\w+\s+(component|feature|function|module)/i,
  /\b(initial commit|initial setup|project initialization|boilerplate)\b/i,
  /\b(generate(d)?|auto(mated)?|script(ed)?)\s+by\s+ai\b/i,
  /^\[bot\]/,
  /^Merge branch/,
  /^Merge pull request/,
];

const humanPatterns = [
  /\b(bug|issue|fix|hotfix|patch|wip|todo|hack)\b.+(?!ai|llm)/i,
  /\b(damn|shoot|crap|oops|temporary|temp|quick fix|workaround)\b/i,
  /\b(refactor|cleanup|extract|inline|rename)\s+.+\s+(because|so that|for)\b/i,
  /[?!]{2,}/, // Multiple punctuation = human emotion
  /\b(typos?|typo fix|spelling)\b/i,
];

export interface AIDetectionResult {
  isAI: boolean;
  confidence: number;
  reason: string;
}

export class AIDetector {
  private client: OpenAI | null = null;
  private useLLM: boolean;

  constructor(apiKey?: string, useLLM: boolean = true) {
    if (apiKey) {
      // Use z.ai Coding API (GLM Coding Plan)
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.z.ai/api/coding/paas/v4',
      });
    }
    this.useLLM = useLLM && !!apiKey;
  }

  /**
   * Check if LLM detection is enabled
   */
  canUseLLM(): boolean {
    return this.useLLM && this.client !== null;
  }

  /**
   * Detect AI from commit message with new logic:
   * 1. Check if message contains AI keywords → immediately AI
   * 2. Otherwise → use LLM to decide
   * 3. Fallback to pattern matching if LLM fails
   */
  async detectFromCommitMessage(message: string): Promise<AIDetectionResult> {
    const trimmed = message.trim();

    // STEP 1: Check AI keywords first (fast path)
    const hasKeyword = await hasAIKeyword(trimmed);
    if (hasKeyword) {
      return {
        isAI: true,
        confidence: 1.0,
        reason: 'Contains AI keyword from database',
      };
    }

    // STEP 2: Use LLM if available
    if (this.canUseLLM()) {
      try {
        return await this.detectWithLLM(trimmed, 'commit');
      } catch (error) {
        console.warn('[AIDetector] LLM detection failed, using pattern fallback:', error);
      }
    }

    // STEP 3: Fallback to pattern matching
    return this.detectFromCommitMessagePattern(trimmed);
  }

  /**
   * Pattern-based detection (fallback only)
   */
  detectFromCommitMessagePattern(message: string): AIDetectionResult {
    const trimmed = message.trim();
    let aiScore = 0;
    let humanScore = 0;
    const reasons: string[] = [];

    // Check AI patterns
    for (const pattern of aiPatterns) {
      if (pattern.test(trimmed)) {
        aiScore += 0.3;
        reasons.push(`Matches AI pattern: ${pattern.source}`);
      }
    }

    // Check human patterns
    for (const pattern of humanPatterns) {
      if (pattern.test(trimmed)) {
        humanScore += 0.4;
        reasons.push(`Matches human pattern: ${pattern.source}`);
      }
    }

    // Length analysis
    const lines = trimmed.split('\n');
    if (lines.length > 5) {
      humanScore += 0.2;
      reasons.push('Multi-line commit message (human characteristic)');
    }

    // Generic/singular patterns
    if (/^(update|fix|add|remove|change|modify)$/i.test(lines[0])) {
      aiScore += 0.3;
      reasons.push('Generic single-word commit');
    }

    // Technical jargon density
    const hasTechnicalTerms = /\b(api|endpoint|schema|migration|query|mutation)\b/i.test(trimmed);
    const hasContextualInfo = /\b(because|so that|fixes|closes|refs? #)\b/i.test(trimmed);

    if (hasContextualInfo) {
      humanScore += 0.3;
      reasons.push('Has contextual reasoning');
    }

    // Structured formatting (Conventional Commits)
    if (/^(feat|fix|chore|docs|style|refactor|test|build)(\(.+\))?:/.test(trimmed)) {
      aiScore += 0.2;
      reasons.push('Conventional commit format (AI often uses this)');
    }

    // Calculate confidence
    const totalScore = aiScore + humanScore;
    const aiRatio = totalScore > 0 ? aiScore / totalScore : 0.5;

    if (aiRatio >= 0.6) {
      return {
        isAI: true,
        confidence: Math.min(0.9, 0.5 + aiRatio * 0.4),
        reason: reasons.join(', ') || 'Pattern-based detection',
      };
    } else if (aiRatio <= 0.4) {
      return {
        isAI: false,
        confidence: Math.min(0.9, 0.5 + (1 - aiRatio) * 0.4),
        reason: reasons.join(', ') || 'Pattern-based detection',
      };
    }

    return {
      isAI: aiRatio > 0.5,
      confidence: 0.5,
      reason: reasons.join(', ') || 'Low confidence - needs manual review',
    };
  }

  /**
   * Detect AI from branch name with new logic:
   * 1. Check if name contains AI keywords → immediately AI
   * 2. Otherwise → use LLM to decide
   * 3. Fallback to pattern matching if LLM fails
   */
  async detectFromBranchName(branchName: string): Promise<AIDetectionResult> {
    const trimmed = branchName.trim();

    // STEP 1: Check AI keywords first
    const hasKeyword = await hasAIKeyword(trimmed);
    if (hasKeyword) {
      return {
        isAI: true,
        confidence: 1.0,
        reason: 'Contains AI keyword from database',
      };
    }

    // STEP 2: Use LLM if available
    if (this.canUseLLM()) {
      try {
        return await this.detectWithLLM(trimmed, 'branch');
      } catch (error) {
        console.warn('[AIDetector] LLM detection failed, using pattern fallback:', error);
      }
    }

    // STEP 3: Fallback to pattern matching
    return this.detectFromBranchNamePattern(trimmed);
  }

  /**
   * Pattern-based branch detection (fallback only)
   */
  detectFromBranchNamePattern(branchName: string): AIDetectionResult {
    const trimmed = branchName.trim().toLowerCase();
    let aiScore = 0;
    let humanScore = 0;
    const reasons: string[] = [];

    // AI branch patterns
    if (/^(feat|fix|chore|feature|bugfix|update|add|remove|create|delete)/.test(trimmed)) {
      aiScore += 0.3;
      reasons.push('Generic conventional prefix');
    }

    if (/\d{4,}/.test(trimmed)) {
      aiScore += 0.2;
      reasons.push('Contains numeric ID (often AI-generated)');
    }

    if (/(ai|generated|auto|bot|automated)/.test(trimmed)) {
      aiScore += 0.5;
      reasons.push('Explicit AI references');
    }

    // Human patterns
    if (/(wip|todo|fix|hack|temp|temporary|experiment|try)/.test(trimmed)) {
      humanScore += 0.4;
      reasons.push('Human workflow markers');
    }

    if (/[a-z]+-[a-z]+-[a-z]+/.test(trimmed) && trimmed.split('-').length > 3) {
      aiScore += 0.2;
      reasons.push('Long kebab-case structure');
    }

    const totalScore = aiScore + humanScore;
    const aiRatio = totalScore > 0 ? aiScore / totalScore : 0.5;

    return {
      isAI: aiRatio >= 0.5,
      confidence: Math.min(0.8, 0.5 + Math.abs(aiRatio - 0.5)),
      reason: reasons.join(', ') || 'Branch name pattern analysis',
    };
  }

  /**
   * Use z.ai LLM (GLM-4.6) to detect AI-generated content
   */
  async detectWithLLM(message: string, type: 'commit' | 'branch'): Promise<AIDetectionResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const isCommit = type === 'commit';
    const prompt = isCommit
      ? `Analyze this commit message and determine if it was written by AI or a human.

Commit: "${message}"

AI indicators: generic conventional commits, perfect grammar, overly structured formats, vague descriptions
Human indicators: contextual reasoning ("because/so that"), wip/todo markers, emotional language, typos, specific context

Reply ONLY with valid JSON in this exact format:
{"isAI": true or false, "confidence": 0.0 to 1.0, "reason": "brief explanation"}`
      : `Analyze this branch name and determine if it was created by AI or a human.

Branch: "${message}"

AI indicators: feat/fix prefixes, numeric ticket IDs, long kebab-case names, generic patterns
Human indicators: wip/todo/temp markers, personal naming, descriptive names

Reply ONLY with valid JSON in this exact format:
{"isAI": true or false, "confidence": 0.0 to 1.0, "reason": "brief explanation"}`;

    try {
      console.log('[AIDetector] Calling LLM for', type, 'detection...');
      const response = await this.client.chat.completions.create({
        model: 'glm-4.5-air',
        messages: [
          {
            role: 'system',
            content: 'You are an AI detection assistant. Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      // Get content from response message
      const responseMessage = response.choices[0]?.message as any;
      let content = responseMessage?.content || responseMessage?.reasoning_content || '';

      // Log raw response for debugging
      console.log('[AIDetector] Raw LLM response:', {
        contentLength: content.length,
        contentPreview: content.substring(0, 200),
        hasContent: !!content,
        finishReason: response.choices[0]?.finish_reason,
      });

      if (!content) {
        console.error('[AIDetector] Empty response from LLM');
        throw new Error('Empty response from LLM');
      }

      // Clean up common issues:
      // 1. Remove markdown code blocks if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      // 2. Trim whitespace
      content = content.trim();

      console.log('[AIDetector] Cleaned content:', content.substring(0, 200));

      // Strategy 1: Try to parse the entire content as JSON
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed.isAI === 'boolean' && typeof parsed.confidence === 'number') {
          console.log('[AIDetector] ✓ Parsed as full JSON:', parsed);
          return {
            isAI: parsed.isAI,
            confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
            reason: `z.ai: ${parsed.reason || 'No explanation'}`,
          };
        }
      } catch (e) {
        console.log('[AIDetector] Full content is not valid JSON, trying extraction...');
      }

      // Strategy 2: Extract JSON using regex patterns (more flexible)
      const patterns = [
        // Standard pattern with isAI
        /\{\s*"isAI"\s*:\s*(true|false)\s*,\s*"confidence"\s*:\s*[\d.]+\s*,\s*"reason"\s*:\s*"[^"]*"\s*\}/,
        // With single quotes
        /\{\s*'isAI'\s*:\s*(true|false)\s*,\s*'confidence'\s*:\s*[\d.]+\s*,\s*'reason'\s*:\s*'[^']*'\s*\}/,
        // With spaces in different places
        /\{\s*"isAI"\s*:\s*(true|false)\s*,\s*"confidence"\s*:\s*[\d.]+\s*,\s*"reason"\s*:\s*"[^"]*"\s*\}/,
        // More permissive - grab any JSON-like object with isAI
        /\{[\s\S]*?"isAI"\s*:\s*(true|false)[\s\S]*?\}/,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          console.log('[AIDetector] Found JSON with pattern:', pattern.toString().substring(0, 50));
          try {
            const parsed = JSON.parse(match[0]);
            return {
              isAI: Boolean(parsed.isAI),
              confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.7)),
              reason: `z.ai: ${parsed.reason || 'Extracted from response'}`,
            };
          } catch (parseError) {
            console.log('[AIDetector] Pattern matched but failed to parse:', parseError);
          }
        }
      }

      // Strategy 3: Try to find any JSON object in the response
      const anyJsonMatch = content.match(/\{[^\n]*\}/);
      if (anyJsonMatch) {
        console.log('[AIDetector] Trying any JSON object found:', anyJsonMatch[0]);
        try {
          const parsed = JSON.parse(anyJsonMatch[0]);
          if (parsed.isAI !== undefined) {
            return {
              isAI: Boolean(parsed.isAI),
              confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.7)),
              reason: `z.ai: ${parsed.reason || 'Fallback extraction'}`,
            };
          }
        } catch (e) {
          console.log('[AIDetector] Any JSON parse failed:', e);
        }
      }

      // All strategies failed
      console.error('[AIDetector] ✗ All parsing strategies failed. Raw content:', content);
      throw new Error(`Could not parse LLM response as JSON. Content: "${content.substring(0, 100)}..."`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Could not parse')) {
        // Re-throw our parsing error
        throw error;
      }
      // Log API errors
      console.error('[AIDetector] z.ai API error:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        type: type,
      });
      throw error; // Re-throw to trigger fallback
    }
  }

  hasMDFilePattern(message: string): boolean {
    const mdPatterns = [
      /readme/i,
      /changelog/i,
      /docs?\s?(update|add|create)/i,
      /\.md\b/,
    ];
    return mdPatterns.some((p) => p.test(message));
  }
}
