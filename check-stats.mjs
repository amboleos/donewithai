import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  const commits = await db.execute(`SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01'`);
  const analyzed = await db.execute(`SELECT COUNT(*) as count FROM code_analyses WHERE source_type = 'commit'`);
  const agentic = await db.execute(`SELECT COUNT(*) as count FROM code_analyses WHERE source_type = 'commit' AND is_agentic = 1`);
  const human = await db.execute(`SELECT COUNT(*) as count FROM code_analyses WHERE source_type = 'commit' AND is_agentic = 0`);
  
  console.log(`2026 Commits: ${commits.rows[0].count}`);
  console.log(`Analyzed: ${analyzed.rows[0].count}`);
  console.log(`  - Agentic AI: ${agentic.rows[0].count}`);
  console.log(`  - Human Assisted: ${human.rows[0].count}`);
  
  const branches = await db.execute(`SELECT COUNT(*) as count FROM branches`);
  const branchAnalyzed = await db.execute(`SELECT COUNT(*) as count FROM code_analyses WHERE source_type = 'branch'`);
  
  console.log(`\nBranches: ${branches.rows[0].count}`);
  console.log(`Analyzed: ${branchAnalyzed.rows[0].count}`);
}

check().catch(console.error);
