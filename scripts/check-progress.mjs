import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function checkProgress() {
  const stats = await client.execute({
    sql: `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_ai_detected = 1 THEN 1 ELSE 0 END) as ai_count,
        SUM(CASE WHEN is_ai_detected = 0 THEN 1 ELSE 0 END) as not_ai_count,
        SUM(CASE WHEN is_ai_detected IS NULL THEN 1 ELSE 0 END) as null_count
      FROM commits
      WHERE date >= '2026-01-01'
    `,
  });

  const s = stats.rows[0];
  console.log(`Progress: ${s.total - s.null_count}/${s.total} processed`);
  console.log(`  AI: ${s.ai_count}, Not AI: ${s.not_ai_count}, Remaining: ${s.null_count}`);

  // Show some recent AI detections
  const recent = await client.execute({
    sql: `
      SELECT c.sha, c.message, c.is_ai_detected, d.confidence_score
      FROM commits c
      LEFT JOIN ai_detections d ON d.commit_id = c.id
      WHERE c.date >= '2026-01-01' AND c.is_ai_detected IS NOT NULL
      ORDER BY c.id DESC
      LIMIT 5
    `,
  });

  console.log('\nRecent detections:');
  for (const r of recent.rows) {
    const status = r.is_ai_detected === 1 ? 'AI' : 'NOT AI';
    const conf = r.confidence_score ? r.confidence_score.toFixed(2) : 'N/A';
    console.log(`  [${r.sha.substring(0, 8)}] ${status} (conf: ${conf}) - ${r.message.substring(0, 40)}...`);
  }
}

checkProgress().catch(console.error);
