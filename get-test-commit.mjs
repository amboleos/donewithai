import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function getCommit() {
  // Get a 2026 commit with some changes
  const commits = await db.execute(`
    SELECT id, sha, message, author, date, repo_id
    FROM commits 
    WHERE date >= '2026-01-01'
    ORDER BY date DESC
    LIMIT 5
  `);
  
  console.log('Recent 2026 commits:');
  for (const c of commits.rows) {
    console.log(`[${c.id}] ${c.sha.substring(0,7)} - ${c.message.substring(0,60)}... (${c.author})`);
  }
}

getCommit().catch(console.error);
