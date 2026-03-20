import { createClient } from '@libsql/client';

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.POSTGRES_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  throw new Error('TURSO_DATABASE_URL environment variable is not set');
}

export const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

export const ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  last_synced: string | null;
  created_at: string;
}

export interface Commit {
  id: number;
  repo_id: number;
  sha: string;
  message: string;
  author: string;
  author_email: string | null;
  date: string;
  lines_added: number;
  lines_removed: number;
  is_ai_detected: number | null;
  created_at: string;
}

export interface Branch {
  id: number;
  repo_id: number;
  name: string;
  created_by: string;
  created_at: string;
  is_ai_detected: number | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  github_username: string | null;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  github_username: string | null;
  role: string;
}

export interface AIDetection {
  id: number;
  commit_id: number | null;
  branch_id: number | null;
  is_ai: number;
  confidence_score: number;
  detected_at: string;
}

export interface UserMapping {
  id: number;
  repo_id: number;
  github_username: string;
  user_id: number;
  created_at: string;
}

// Create tables
export async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      owner TEXT NOT NULL,
      last_synced TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS commits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      sha TEXT UNIQUE NOT NULL,
      message TEXT NOT NULL,
      author TEXT NOT NULL,
      author_email TEXT,
      date TEXT NOT NULL,
      lines_added INTEGER DEFAULT 0,
      lines_removed INTEGER DEFAULT 0,
      is_ai_detected INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_ai_detected INTEGER,
      UNIQUE(repo_id, name)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'developer',
      github_username TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add role and github_username if they don't exist (for existing DBs)
  try {
    await client.execute(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'developer'`);
  } catch (e: any) {
    // Ignore "duplicate column name" error only
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  try {
    await client.execute(`ALTER TABLE users ADD COLUMN github_username TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  // Set first user as admin if no admin exists
  await client.execute({
    sql: `UPDATE users SET role = ? WHERE id = 1 AND role = ?`,
    args: [ROLES.ADMIN, ROLES.DEVELOPER],
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
      github_username TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(repo_id, github_username)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ai_detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commit_id INTEGER REFERENCES commits(id) ON DELETE CASCADE,
      branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
      is_ai INTEGER NOT NULL,
      confidence_score REAL,
      detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (commit_id IS NOT NULL OR branch_id IS NOT NULL)
    )
  `);

  // Create indexes
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_commits_repo_id ON commits(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_branches_repo_id ON branches(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_mappings_repo ON user_mappings(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_mappings_github ON user_mappings(github_username)`);
}

// Repo operations
export async function createRepo(name: string, url: string, owner: string) {
  const result = await client.execute({
    sql: `INSERT INTO repos (name, url, owner) VALUES (?, ?, ?) RETURNING *`,
    args: [name, url, owner],
  });
  return result.rows[0] as unknown as Repo;
}

export async function getRepos() {
  const result = await client.execute(`SELECT * FROM repos ORDER BY created_at DESC`);
  return result.rows as unknown as Repo[];
}

export async function getRepoById(id: number) {
  const result = await client.execute({
    sql: `SELECT * FROM repos WHERE id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as Repo | undefined;
}

export async function getRepoByUrl(url: string) {
  const result = await client.execute({
    sql: `SELECT * FROM repos WHERE url = ?`,
    args: [url],
  });
  return result.rows as unknown as Repo[];
}

export async function updateRepoLastSynced(id: number) {
  await client.execute({
    sql: `UPDATE repos SET last_synced = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [id],
  });
}

export async function deleteRepo(id: number) {
  await client.execute({
    sql: `DELETE FROM repos WHERE id = ?`,
    args: [id],
  });
}

// Commit operations
export async function upsertCommit(
  repoId: number,
  sha: string,
  message: string,
  author: string,
  authorEmail: string | null,
  date: Date,
  linesAdded: number = 0,
  linesRemoved: number = 0
) {
  const isoDate = date.toISOString();
  const result = await client.execute({
    sql: `
      INSERT INTO commits (repo_id, sha, message, author, author_email, date, lines_added, lines_removed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (sha) DO UPDATE SET
        message = excluded.message,
        author = excluded.author,
        author_email = excluded.author_email,
        date = excluded.date,
        lines_added = excluded.lines_added,
        lines_removed = excluded.lines_removed
      RETURNING *
    `,
    args: [repoId, sha, message, author, authorEmail, isoDate, linesAdded, linesRemoved],
  });
  return result.rows[0] as unknown as Commit;
}

export async function getCommitsByRepo(repoId: number, limit: number = 100) {
  const result = await client.execute({
    sql: `SELECT * FROM commits WHERE repo_id = ? ORDER BY date DESC LIMIT ?`,
    args: [repoId, limit],
  });
  return result.rows as unknown as Commit[];
}

export async function updateCommitAIDetection(commitId: number, isAI: boolean, confidence: number) {
  await client.execute({
    sql: `UPDATE commits SET is_ai_detected = ? WHERE id = ?`,
    args: [isAI ? 1 : 0, commitId],
  });
  await client.execute({
    sql: `INSERT INTO ai_detections (commit_id, is_ai, confidence_score) VALUES (?, ?, ?)`,
    args: [commitId, isAI ? 1 : 0, confidence],
  });
}

// Branch operations
export async function upsertBranch(
  repoId: number,
  name: string,
  createdBy: string,
  createdAt: Date
) {
  const isoDate = createdAt.toISOString();
  const result = await client.execute({
    sql: `
      INSERT INTO branches (repo_id, name, created_by, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (repo_id, name) DO UPDATE SET
        created_by = excluded.created_by,
        created_at = excluded.created_at
      RETURNING *
    `,
    args: [repoId, name, createdBy, isoDate],
  });
  return result.rows[0] as unknown as Branch;
}

export async function getBranchesByRepo(repoId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM branches WHERE repo_id = ? ORDER BY created_at DESC`,
    args: [repoId],
  });
  return result.rows as unknown as Branch[];
}

export async function updateBranchAIDetection(branchId: number, isAI: boolean) {
  await client.execute({
    sql: `UPDATE branches SET is_ai_detected = ? WHERE id = ?`,
    args: [isAI ? 1 : 0, branchId],
  });
}

export async function updateBranchAIDetectionManual(branchId: number, isAI: boolean) {
  await client.execute({
    sql: `UPDATE branches SET is_ai_detected = ? WHERE id = ?`,
    args: [isAI ? 1 : 0, branchId],
  });
  await client.execute({
    sql: `INSERT INTO ai_detections (branch_id, is_ai, confidence_score) VALUES (?, ?, ?)`,
    args: [branchId, isAI ? 1 : 0, 1.0],
  });
}

export async function updateCommitAIDetectionManual(commitId: number, isAI: boolean) {
  await client.execute({
    sql: `UPDATE commits SET is_ai_detected = ? WHERE id = ?`,
    args: [isAI ? 1 : 0, commitId],
  });
  await client.execute({
    sql: `INSERT INTO ai_detections (commit_id, is_ai, confidence_score) VALUES (?, ?, ?)`,
    args: [commitId, isAI ? 1 : 0, 1.0],
  });
}

// User operations
export async function upsertUser(
  email: string,
  name: string,
  password: string,
  githubUsername?: string
) {
  const result = await client.execute({
    sql: `
      INSERT INTO users (email, name, password, github_username)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (email) DO UPDATE SET
        name = excluded.name,
        password = excluded.password,
        github_username = excluded.github_username
      RETURNING *
    `,
    args: [email, name, password, githubUsername || null],
  });
  return result.rows[0] as unknown as User;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await client.execute({
    sql: `SELECT * FROM users WHERE email = ?`,
    args: [email],
  });
  return result.rows[0] as unknown as User | undefined;
}

export async function getUserById(id: number) {
  const result = await client.execute({
    sql: `SELECT * FROM users WHERE id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as User | undefined;
}

export async function getUsers() {
  const result = await client.execute(`SELECT * FROM users ORDER BY created_at DESC`);
  return result.rows as unknown as User[];
}

// User mapping operations
export async function createUserMapping(
  repoId: number,
  githubUsername: string,
  userId: number
) {
  const result = await client.execute({
    sql: `
      INSERT INTO user_mappings (repo_id, github_username, user_id)
      VALUES (?, ?, ?)
      RETURNING *
    `,
    args: [repoId, githubUsername.toLowerCase(), userId],
  });
  return result.rows[0] as unknown as UserMapping;
}

export async function getMappingsByRepo(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT um.*, u.name, u.email
      FROM user_mappings um
      JOIN users u ON um.user_id = u.id
      WHERE um.repo_id = ?
      ORDER BY um.github_username
    `,
    args: [repoId],
  });
  return result.rows as unknown as (UserMapping & { name: string; email: string })[];
}

export async function deleteMapping(id: number) {
  await client.execute({
    sql: `DELETE FROM user_mappings WHERE id = ?`,
    args: [id],
  });
}

export async function getGithubUsersByRepo(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT DISTINCT author
      FROM commits
      WHERE repo_id = ?
      ORDER BY author
    `,
    args: [repoId],
  });
  return result.rows.map((row: any) => row.author) as string[];
}

export async function getAllUsers(): Promise<PublicUser[]> {
  const result = await client.execute({
    sql: `SELECT id, name, email, github_username, role FROM users ORDER BY name`,
  });
  return result.rows as unknown as PublicUser[];
}

// Analytics queries
export async function getRepoAnalytics(repoId: number, days: number = 30) {
  const result = await client.execute({
    sql: `
      SELECT
        date(date) as day,
        COUNT(*) as commit_count,
        SUM(lines_added) as lines_added,
        SUM(lines_removed) as lines_removed,
        SUM(CASE WHEN is_ai_detected = 1 THEN 1 ELSE 0 END) as ai_commits
      FROM commits
      WHERE repo_id = ?
        AND date >= date('now', '-' || ? || ' days')
      GROUP BY day
      ORDER BY day
    `,
    args: [repoId, days],
  });
  return result.rows;
}

export async function getDeveloperStats(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT
        author,
        COUNT(*) as total_commits,
        SUM(lines_added) as total_lines_added,
        SUM(lines_removed) as total_lines_removed,
        SUM(CASE WHEN is_ai_detected = 1 THEN 1 ELSE 0 END) as ai_commits,
        ROUND(
          100.0 * SUM(CASE WHEN is_ai_detected = 1 THEN 1 ELSE 0 END) / CAST(COUNT(*) AS REAL),
          1
        ) as ai_percentage
      FROM commits
      WHERE repo_id = ?
      GROUP BY author
      ORDER BY total_commits DESC
    `,
    args: [repoId],
  });
  return result.rows;
}
