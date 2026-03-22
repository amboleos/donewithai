import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function test() {
  // Get repos
  const repos = await db.execute('SELECT id, name, url, provider FROM repos');
  console.log('=== REPOS ===');
  for (const repo of repos.rows) {
    console.log(`[${repo.id}] ${repo.name} (${repo.provider}) - ${repo.url}`);
  }
  
  // Get branches for first repo
  console.log('\n=== BRANCHES (first repo) ===');
  const branches = await db.execute(`
    SELECT b.id, b.name, b.repo_id, r.name as repo_name, COUNT(c.id) as commit_count
    FROM branches b
    LEFT JOIN commits c ON c.repo_id = b.repo_id
    LEFT JOIN repos r ON r.id = b.repo_id
    GROUP BY b.id
    ORDER BY commit_count DESC
    LIMIT 20
  `);
  for (const b of branches.rows) {
    console.log(`[${b.id}] ${b.repo_name}/${b.name} - ${b.commit_count} commits`);
  }
  
  // Get commits from 2026 (AI analysis cutoff)
  console.log('\n=== 2026 COMMITS ===');
  const commits2026 = await db.execute(`
    SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01'
  `);
  console.log(`2026 commits: ${commits2026.rows[0].count}`);
}

test().catch(console.error);
