import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.POSTGRES_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function main() {
  console.log('Checking database for 2026 commits...\n');

  // Get repos
  const reposResult = await client.execute(`SELECT id, name, url FROM repos`);
  console.log('Available repos:');
  for (const repo of reposResult.rows) {
    console.log(`  - ID: ${repo.id}, Name: ${repo.name}`);
  }

  if (reposResult.rows.length === 0) {
    console.log('\nNo repos found. Please add a repo first.');
    return;
  }

  const repoId = reposResult.rows[0].id;

  // Check 2026 commits
  const commits2026 = await client.execute({
    sql: `
      SELECT id, sha, message, author, date, is_ai_detected
      FROM commits
      WHERE repo_id = ? AND date >= '2026-01-01'
      ORDER BY date DESC
    `,
    args: [repoId],
  });

  console.log(`\n2026 commits: ${commits2026.rows.length}`);
  for (const commit of commits2026.rows.slice(0, 10)) {
    const aiStatus = commit.is_ai_detected === null ? 'NULL' : (commit.is_ai_detected === 1 ? 'AI' : 'NOT AI');
    console.log(`  - ${commit.sha.substring(0, 8)} | ${commit.message.substring(0, 50)} | ${aiStatus}`);
  }

  // Check commits without AI detection
  const noAI = await client.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM commits
      WHERE repo_id = ? AND is_ai_detected IS NULL
    `,
    args: [repoId],
  });
  console.log(`\nCommits without AI detection: ${noAI.rows[0].count}`);
}

main().catch(console.error);
