// Clean AI detection data but keep users
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function clean() {
  console.log('Cleaning AI detection data...');
  
  // Check what we have
  const commits = await db.execute('SELECT COUNT(*) as count FROM commits');
  const branches = await db.execute('SELECT COUNT(*) as count FROM branches');
  const analyses = await db.execute('SELECT COUNT(*) as count FROM code_analyses');
  const users = await db.execute('SELECT COUNT(*) as count FROM users');
  
  console.log('Before cleanup:');
  console.log(`  - Commits: ${commits.rows[0].count}`);
  console.log(`  - Branches: ${branches.rows[0].count}`);
  console.log(`  - Code analyses: ${analyses.rows[0].count}`);
  console.log(`  - Users: ${users.rows[0].count} (will be preserved)`);
  
  // Delete code analyses
  await db.execute('DELETE FROM code_analyses');
  console.log('✓ Deleted code_analyses');
  
  // Reset AI flags on commits
  const commitResult = await db.execute('UPDATE commits SET is_ai_detected = NULL');
  console.log(`✓ Reset AI flags on ${commitResult.rowsAffected} commits`);
  
  // Reset AI flags on branches
  const branchResult = await db.execute('UPDATE branches SET is_ai_detected = NULL');
  console.log(`✓ Reset AI flags on ${branchResult.rowsAffected} branches`);
  
  console.log('\nDone! Users preserved, AI data cleaned.');
}

clean().catch(console.error);
