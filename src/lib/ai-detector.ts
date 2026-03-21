import Anthropic from '@anthropic-ai/sdk';

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
  private anthropic: Anthropic | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  detectFromCommitMessage(message: string): AIDetectionResult {
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

  detectFromBranchName(branchName: string): AIDetectionResult {
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

  async detectWithLLM(message: string, type: 'commit' | 'branch'): Promise<AIDetectionResult> {
    if (!this.anthropic) {
      return this.detectFromCommitMessage(message);
    }

    try {
      const prompt = type === 'commit'
        ? `Analyze this commit message and determine if it was written by a human or AI. Reply with JSON: {"isAI": boolean, "confidence": number, "reason": string}. Commit: "${message}"`
        : `Analyze this branch name and determine if it was created by a human or AI. Reply with JSON: {"isAI": boolean, "confidence": number, "reason": string}. Branch: "${message}"`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            isAI: parsed.isAI,
            confidence: parsed.confidence || 0.7,
            reason: `LLM Analysis: ${parsed.reason || 'No reason provided'}`,
          };
        }
      }
    } catch (error) {
      console.error('LLM detection failed, falling back to pattern matching:', error);
    }

    return this.detectFromCommitMessage(message);
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
