import OpenAI from 'openai';

const apiKey = process.env.ZAI_API_KEY;
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

async function testCommit(message) {
  const prompt = `You are an expert at detecting AI-generated git commit messages.

Analyze this commit message and determine if it was likely written by:
1. AI tools (Copilot, ChatGPT, Claude, etc.) - mark as AI
2. A human developer - mark as human

Commit message: "${message}"

Consider these indicators:
- AI: Generic descriptions, conventional commits without context, perfect grammar, structured formats
- Human: Specific context, emotional language, typos, personal notes, "because/so that" explanations

Reply ONLY with valid JSON in this exact format: {"isAI": true/false, "confidence": 0.0-1.0, "reason": "short explanation"}`;

  console.log(`\nTesting: "${message.substring(0, 50)}..."`);

  const response = await client.chat.completions.create({
    model: 'glm-4.6',
    messages: [
      { role: 'system', content: 'You are an AI detection assistant. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const messageResp = response.choices[0]?.message;
  let content = messageResp?.content || messageResp?.reasoning_content || '';

  console.log(`Raw response: "${content}"`);
  console.log(`Length: ${content.length}`);

  // Try to extract JSON
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`✅ Parsed: isAI=${parsed.isAI}, confidence=${parsed.confidence}, reason="${parsed.reason}"`);
    } catch (e) {
      console.log(`❌ Parse error: ${e.message}`);
      console.log(`JSON string: "${jsonMatch[0]}"`);
    }
  } else {
    console.log(`❌ No JSON found`);
  }
}

const testMessages = [
  'feat: add user authentication component',
  'fix: resolve memory leak',
  'aws migration part1',
  'Merge pull request #123 from feature/add-login',
  'this is a quick fix because the damn thing broke',
];

for (const msg of testMessages) {
  await testCommit(msg);
  await new Promise(r => setTimeout(r, 500));
}
