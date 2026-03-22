import OpenAI from 'openai';

const apiKey = process.env.ZAI_API_KEY;

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

const simplePrompt = `Reply ONLY with valid JSON: {"status": "ok", "message": "hello"}`;

console.log('Test 1: Simple request with max_tokens=500');
try {
  const response = await client.chat.completions.create({
    model: 'glm-4.6',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: simplePrompt },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  const reasoning = response.choices[0]?.message?.reasoning_content;

  console.log('Content:', content || '(empty)');
  console.log('Reasoning:', reasoning?.substring(0, 100) || '(none)');
  console.log('Has content:', !!content);
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n\nTest 2: Try with different model');
try {
  const response = await client.chat.completions.create({
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: 'You are a JSON API.' },
      { role: 'user', content: 'Return JSON: {"result": "test"}' },
    ],
    temperature: 0.1,
    max_tokens: 100,
  });

  const content = response.choices[0]?.message?.content;
  const reasoning = response.choices[0]?.message?.reasoning_content;

  console.log('Model:', response.model);
  console.log('Content:', content || '(empty)');
  console.log('Has reasoning:', !!reasoning);
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n\nTest 3: Check available models');
try {
  // Try to get model list - this endpoint may not exist
  console.log('Listing models...');
  const models = await client.models.list();
  console.log('Available models:', models.data.map(m => m.id));
} catch (error) {
  console.error('Cannot list models:', error.message);
}
