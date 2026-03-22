import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  const schema = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  console.log('Users table schema:', schema.rows);
  
  const users = await db.execute('SELECT * FROM users LIMIT 3');
  console.log('Users:', users.rows);
}

check().catch(console.error);
