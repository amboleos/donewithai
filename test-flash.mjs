import OpenAI from 'openai';

const apiKey = process.env.ZAI_API_KEY;
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

async function testModel(model) {
  const prompt = `Analyze this commit message: "feat: add user authentication component"

AI indicators: Generic, conventional commits without context, perfect grammar.
Human indicators: Specific context, emotional language, typos, "because/so that" explanations.

Reply ONLY with JSON: {"isAI": true/false, "confidence": 0.0-1.0, "reason": "short"}`;

  console.log(`\nTesting model: ${model}`);

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a JSON API. Reply with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const messageResp = response.choices[0]?.message;
    const content = messageResp?.content || '';
    const reasoning = messageResp?.reasoning_content || '';

    console.log(`  Content length: ${content.length}`);
    console.log(`  Reasoning length: ${reasoning.length}`);
    console.log(`  Content: "${content}"`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`  ✅ SUCCESS: isAI=${parsed.isAI}, conf=${parsed.confidence}`);
        return { model, success: true };
      } catch (e) {
        console.log(`  ❌ Parse error: ${e.message}`);
        return { model, success: false };
      }
    } else {
      console.log(`  ❌ No JSON found`);
      return { model, success: false };
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { model, success: false, error: error.message };
  }
}

const models = ['glm-4-flash', 'glm-4.5', 'glm-4.5-air', 'glm-4.6'];

console.log('Testing available models...\n');
for (const model of models) {
  await testModel(model);
  await new Promise(r => setTimeout(r, 300));
}

// Test with extra_messages parameter to disable reasoning
console.log('\n\nTesting with extra_messages to disable reasoning...');
try {
  const response = await client.chat.completions.create({
    model: 'glm-4.6',
    messages: [
      { role: 'system', content: 'JSON API only.' },
      { role: 'user', content: 'Reply with JSON: {"result": "ok"}' },
    ],
    temperature: 0.1,
    max_tokens: 100,
    extra_body: {
      reasoning_mode: 'disabled'
    }
  });
  console.log('With reasoning_mode=disabled:', response.choices[0]?.message?.content);
} catch (e) {
  console.log('Error with extra_body:', e.message);
}
