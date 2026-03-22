import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function resetPassword() {
  const password = await bcrypt.hash('test123', 10);

  await client.execute({
    sql: `UPDATE users SET password = ? WHERE email = ?`,
    args: [password, 'super-admin@example.com'],
  });

  console.log('Password for super-admin@example.com has been reset to: test123');
}

resetPassword().catch(console.error);
