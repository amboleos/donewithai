import OpenAI from 'openai';

const apiKey = process.env.ZAI_API_KEY;
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

async function testWithModel(message, model, maxTokens) {
  const prompt = `Analyze this commit message and determine if it was likely written by AI tools (Copilot, ChatGPT, Claude) or a human developer.

Commit message: "${message}"

AI indicators: Generic descriptions, conventional commits without context, perfect grammar, structured formats.
Human indicators: Specific context, emotional language, typos, personal notes, "because/so that" explanations.

Reply ONLY with valid JSON: {"isAI": true/false, "confidence": 0.0-1.0, "reason": "short explanation"}`;

  console.log(`\n[${model}, max_tokens=${maxTokens}] Testing: "${message.substring(0, 40)}..."`);

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a JSON API. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    });

    const messageResp = response.choices[0]?.message;
    let content = messageResp?.content || messageResp?.reasoning_content || '';

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`  ✅ isAI=${parsed.isAI}, conf=${parsed.confidence}`);
        return true;
      } catch (e) {
        console.log(`  ❌ Parse error: ${e.message.substring(0, 50)}`);
        return false;
      }
    } else {
      console.log(`  ❌ No JSON found. Content: "${content.substring(0, 100)}"`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ API error: ${error.message}`);
    return false;
  }
}

const testMessage = 'feat: add user authentication component';

console.log('Testing different configurations:\n');
console.log('='.repeat(50));

// Test different configurations
const configs = [
  ['glm-4.6', 500],
  ['glm-4.6', 1000],
  ['glm-5-turbo', 500],
  ['glm-5-turbo', 200],
];

for (const [model, tokens] of configs) {
  await testWithModel(testMessage, model, tokens);
  await new Promise(r => setTimeout(r, 500));
}
