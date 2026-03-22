import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function main() {
  console.log('=== AI Recheck API Test ===\n');

  // Check if there's an admin user
  const users = await client.execute(`SELECT id, email, role FROM users`);
  console.log('Users in database:');
  for (const user of users.rows) {
    console.log(`  - ${user.email} (${user.role})`);
  }

  if (users.rows.length === 0) {
    console.log('\nNo users found. Creating admin user...');
    const bcrypt = await import('bcrypt');
    const password = await bcrypt.hash('admin123', 10);
    await client.execute({
      sql: `INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)`,
      args: ['admin@test.com', 'Admin User', password, 'admin'],
    });
    console.log('Created admin user: admin@test.com / admin123');
  }

  // Check 2026 commits
  const commits2026 = await client.execute({
    sql: `
      SELECT COUNT(*) as total,
             SUM(CASE WHEN is_ai_detected = 1 THEN 1 ELSE 0 END) as ai_count,
             SUM(CASE WHEN is_ai_detected = 0 THEN 1 ELSE 0 END) as not_ai_count,
             SUM(CASE WHEN is_ai_detected IS NULL THEN 1 ELSE 0 END) as null_count
      FROM commits
      WHERE date >= '2026-01-01'
    `,
  });

  console.log('\n2026 commits status:');
  const stats = commits2026.rows[0];
  console.log(`  Total: ${stats.total}`);
  console.log(`  Detected as AI: ${stats.ai_count}`);
  console.log(`  Detected as Human: ${stats.not_ai_count}`);
  console.log(`  Not checked yet: ${stats.null_count}`);

  console.log('\n=== To test the API ===');
  console.log('1. Login at http://localhost:3000/api/auth/login');
  console.log('   Body: {"email":"admin@test.com","password":"admin123"}');
  console.log('2. Use the returned cookie to call POST /api/sync/recheck-ai');
  console.log('   Body: {"repoId": 1}');
}

main().catch(console.error);
