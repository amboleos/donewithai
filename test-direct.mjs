// Test AI detection directly with updated code
import OpenAI from 'openai';

const apiKey = process.env.ZAI_API_KEY;

async function detectWithLLM(message) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.z.ai/api/coding/paas/v4',
  });

  const prompt = `Analyze commit: "${message}"

AI indicators: generic conventional commits, perfect grammar, structured formats
Human indicators: "because/so that", wip/todo, emotional language, typos

Reply JSON: {"isAI": true/false, "confidence": 0.0-1.0, "reason": "short"}`;

  const response = await client.chat.completions.create({
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
  const msg = response.choices[0]?.message;
  let content = msg?.content || msg?.reasoning_content || '';

  console.log(`\nTesting: "${message}"`);
  console.log(`Content length: ${content.length}`);
  console.log(`Has content field: ${!!msg?.content}`);
  console.log(`Has reasoning_content: ${!!msg?.reasoning_content}`);

  if (!content) {
    throw new Error('Empty response from LLM');
  }

  // Extract JSON from response - find the LAST complete JSON object (final answer)
  const jsonMatches = content.match(/\{[\s\S]*?\}/g);
  const jsonMatch = jsonMatches?.[jsonMatches.length - 1];

  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch);
    return {
      isAI: Boolean(parsed.isAI),
      confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.7)),
      reason: `z.ai GLM-4.6: ${parsed.reason || 'No explanation provided'}`,
    };
  }

  throw new Error('Could not parse LLM response as JSON');
}

async function main() {
  const testCommits = [
    'feat: add user authentication component',
    'fix: resolve memory leak',
    'this is a quick fix because the damn thing broke',
    'Merge pull request #123 from feature/add-login',
    'auto-claude: generated PR description',
  ];

  for (const commit of testCommits) {
    try {
      const result = await detectWithLLM(commit);
      console.log(`  ✅ isAI: ${result.isAI}, confidence: ${result.confidence.toFixed(2)}`);
      console.log(`     reason: ${result.reason}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(console.error);
