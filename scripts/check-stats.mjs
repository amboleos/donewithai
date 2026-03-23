import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  // Use is_ai_detected from commits table (single source of truth)
  const commits = await db.execute(`SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01'`);
  const agentic = await db.execute(`SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01' AND is_ai_detected = 1`);
  const human = await db.execute(`SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01' AND is_ai_detected = 0`);
  const notAnalyzed = await db.execute(`SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01' AND is_ai_detected IS NULL`);

  console.log(`2026 Commits: ${commits.rows[0].count}`);
  console.log(`  - Agentic AI: ${agentic.rows[0].count}`);
  console.log(`  - Human Assisted: ${human.rows[0].count}`);
  console.log(`  - Not Analyzed: ${notAnalyzed.rows[0].count}`);

  // Use is_ai_detected from branches table (single source of truth)
  const branches = await db.execute(`SELECT COUNT(*) as count FROM branches`);
  const branchAgentic = await db.execute(`SELECT COUNT(*) as count FROM branches WHERE is_ai_detected = 1`);
  const branchHuman = await db.execute(`SELECT COUNT(*) as count FROM branches WHERE is_ai_detected = 0`);
  const branchNotAnalyzed = await db.execute(`SELECT COUNT(*) as count FROM branches WHERE is_ai_detected IS NULL`);

  console.log(`\nBranches: ${branches.rows[0].count}`);
  console.log(`  - Agentic AI: ${branchAgentic.rows[0].count}`);
  console.log(`  - Human Assisted: ${branchHuman.rows[0].count}`);
  console.log(`  - Not Analyzed: ${branchNotAnalyzed.rows[0].count}`);
}

check().catch(console.error);
