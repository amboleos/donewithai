import { createClient } from '@libsql/client';
import { GitProviderType } from '@/types';

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.POSTGRES_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

// AI Cutoff Date - only process commits from 2026 onwards
export const AI_CUTOFF_DATE = '2026-01-01T00:00:00.000Z';

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
  provider: GitProviderType;
  token_env_var: string | null;
  last_synced: string | null;
  sync_error: string | null;
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

export interface AIJob {
  id: number;
  repo_id: number;
  user_id: number | null;  // null = unmapped author
  period: string;  // '2025-Q1', '2025-Q2', etc.
  source_type: 'commit' | 'branch';
  source_id: number;  // commit.id or branch.id
  points: number;
  detection_method: 'keyword' | 'llm' | 'manual';
  period_date: string;  // The date used for period calculation
  created_at: string;
}

export interface AIDetectionQueue {
  id: number;
  repo_id: number;
  commit_id: number | null;
  branch_id: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface AIKeyword {
  id: number;
  keyword: string;
  is_active: number;  // 0 or 1
  created_at: string;
}

export interface CodeAnalysis {
  id: number;
  repo_id: number;
  source_type: 'commit' | 'branch';
  source_id: number;
  is_agentic: number;  // 1 or 0
  confidence: number;
  report: string;  // JSON string
  model: string;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface CodeAnalysisReport {
  summary: string;
  filesAnalyzed: number;
  linesAdded: number;
  linesRemoved: number;
  patternsFound: string[];
  fileBreakdown: FileAnalysis[];
  reasoning: string;
}

export interface FileAnalysis {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  patterns: string[];
  isExcluded: boolean;
  excludeReason?: string;
}

// Create tables
export async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      owner TEXT NOT NULL,
      provider TEXT DEFAULT 'github',
      token_env_var TEXT,
      sync_error TEXT,
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

  // Add provider, token_env_var, sync_error to repos table if they don't exist
  try {
    await client.execute(`ALTER TABLE repos ADD COLUMN provider TEXT DEFAULT 'github'`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  try {
    await client.execute(`ALTER TABLE repos ADD COLUMN token_env_var TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  try {
    await client.execute(`ALTER TABLE repos ADD COLUMN sync_error TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  // Update existing repos to have provider='github'
  await client.execute({
    sql: `UPDATE repos SET provider = 'github' WHERE provider IS NULL`,
    args: [],
  });

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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ai_detection_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      commit_id INTEGER,
      branch_id INTEGER,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      user_id INTEGER,
      period TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      detection_method TEXT NOT NULL,
      period_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(repo_id, source_type, source_id),
      FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ai_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default keywords
  await client.execute(`
    INSERT OR IGNORE INTO ai_keywords (keyword) VALUES
      ('auto-claude'), ('copilot'), ('ai-generated'), ('gpt'), ('llm'),
      ('claude'), ('chatgpt'), ('gemini'), ('openai'), ('ai assist'),
      ('ai assisted')
  `);

  // Code analysis results table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS code_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      source_type TEXT NOT NULL,        -- 'commit' | 'branch'
      source_id INTEGER NOT NULL,       -- commit.id or branch.id

      -- Analysis result
      is_agentic INTEGER NOT NULL,      -- 1 = Agentic AI, 0 = Human Assisted
      confidence REAL NOT NULL,         -- 0.0 - 1.0

      -- Detailed report (JSON)
      report TEXT NOT NULL,

      -- Metadata
      model TEXT NOT NULL,              -- 'z.ai-4.5-air'
      tokens_used INTEGER,
      duration_ms INTEGER,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
      UNIQUE(repo_id, source_type, source_id)
    )
  `);

  // Indexes for code_analyses
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_code_analyses_repo ON code_analyses(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_code_analyses_source ON code_analyses(source_type, source_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_code_analyses_agentic ON code_analyses(is_agentic, confidence)`);

  // Junction table to track which commits belong to which branches
  // This is needed for branch aggregation AI job calculation
  await client.execute(`
    CREATE TABLE IF NOT EXISTS branch_commits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      commit_id INTEGER NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(branch_id, commit_id),
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
      FOREIGN KEY (commit_id) REFERENCES commits(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_commits_repo_id ON commits(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_branches_repo_id ON branches(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_mappings_repo ON user_mappings(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_mappings_github ON user_mappings(github_username)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_repos_provider ON repos(provider)`);

  // AI job tracking indexes
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_detection_queue(status, retry_count)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_queue_repo ON ai_detection_queue(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_period ON ai_jobs(period)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_jobs(user_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_repo ON ai_jobs(repo_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_repo_period ON ai_jobs(user_id, repo_id, period)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_branch_commits_branch ON branch_commits(branch_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_branch_commits_commit ON branch_commits(commit_id)`);
}

// Repo operations
export async function createRepo(
  name: string,
  url: string,
  owner: string,
  provider: GitProviderType = 'github',
  token_env_var: string | null = null
) {
  const result = await client.execute({
    sql: `
      INSERT INTO repos (name, url, owner, provider, token_env_var)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `,
    args: [name, url, owner, provider, token_env_var],
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

export async function updateRepoError(id: number, error: string | null) {
  await client.execute({
    sql: `UPDATE repos SET sync_error = ? WHERE id = ?`,
    args: [error, id],
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

export async function getCommitBySha(repoId: number, sha: string) {
  const result = await client.execute({
    sql: `SELECT * FROM commits WHERE repo_id = ? AND sha = ? LIMIT 1`,
    args: [repoId, sha],
  });
  return result.rows[0] as unknown as Commit | undefined;
}

export async function getCommitsByRepo(repoId: number, limit: number = 100) {
  const result = await client.execute({
    sql: `SELECT * FROM commits WHERE repo_id = ? AND date >= ? ORDER BY date DESC LIMIT ?`,
    args: [repoId, AI_CUTOFF_DATE, limit],
  });
  return result.rows as unknown as Commit[];
}

export async function getAllCommitsByRepo(repoId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM commits WHERE repo_id = ? AND date >= ? ORDER BY date DESC`,
    args: [repoId, AI_CUTOFF_DATE],
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

export async function updateCommitLines(
  repoId: number,
  sha: string,
  linesAdded: number,
  linesRemoved: number
) {
  await client.execute({
    sql: `
      UPDATE commits
      SET lines_added = ?, lines_removed = ?
      WHERE repo_id = ? AND sha = ?
    `,
    args: [linesAdded, linesRemoved, repoId, sha],
  });
}

export async function getPendingCommitsForDiffstat(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT sha FROM commits
      WHERE repo_id = ? AND lines_added = 0 AND lines_removed = 0
      ORDER BY date DESC
    `,
    args: [repoId],
  });
  return result.rows as unknown as Array<{ sha: string }>;
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
  // Only return branches that have at least one commit from 2026+
  const result = await client.execute({
    sql: `
      SELECT DISTINCT b.*
      FROM branches b
      JOIN branch_commits bc ON b.id = bc.branch_id
      JOIN commits c ON bc.commit_id = c.id
      WHERE b.repo_id = ? AND c.date >= ?
      ORDER BY b.name
    `,
    args: [repoId, AI_CUTOFF_DATE],
  });
  return result.rows as unknown as Branch[];
}

export async function getBranchNamesByRepo(repoId: number): Promise<string[]> {
  const result = await client.execute({
    sql: `SELECT name FROM branches WHERE repo_id = ?`,
    args: [repoId],
  });
  return result.rows.map((row: any) => row.name) as string[];
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
      WHERE repo_id = ? AND date >= ?
      ORDER BY author
    `,
    args: [repoId, AI_CUTOFF_DATE],
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
        AND date >= ?
        AND date >= date('now', '-' || ? || ' days')
      GROUP BY day
      ORDER BY day
    `,
    args: [repoId, AI_CUTOFF_DATE, days],
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
      WHERE repo_id = ? AND date >= ?
      GROUP BY author
      ORDER BY total_commits DESC
    `,
    args: [repoId, AI_CUTOFF_DATE],
  });
  return result.rows;
}

export async function getMappedAuthor(repoId: number, githubAuthor: string): Promise<string> {
  const result = await client.execute({
    sql: `
      SELECT u.name
      FROM user_mappings um
      JOIN users u ON um.user_id = u.id
      WHERE um.repo_id = ? AND LOWER(um.github_username) = LOWER(?)
    `,
    args: [repoId, githubAuthor],
  });

  if (result.rows.length > 0) {
    return (result.rows[0] as any).name;
  }

  // Return with (unmapped) suffix
  return `${githubAuthor} (unmapped)`;
}

export async function getDeveloperStatsWithMappings(repoId: number) {
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
      WHERE repo_id = ? AND date >= ?
      GROUP BY author
      ORDER BY total_commits DESC
    `,
    args: [repoId, AI_CUTOFF_DATE],
  });

  const rows = result.rows as any[];

  // Apply mappings
  const stats = await Promise.all(
    rows.map(async (row) => {
      const mappedName = await getMappedAuthor(repoId, row.author);
      return {
        ...row,
        author: mappedName,
        originalAuthor: row.author,
      };
    })
  );

  return stats;
}

// AI Job operations
export async function createAIJob(
  repoId: number,
  userId: number | null,
  period: string,
  sourceType: 'commit' | 'branch',
  sourceId: number,
  points: number,
  detectionMethod: 'keyword' | 'llm' | 'manual',
  periodDate: string
) {
  const result = await client.execute({
    sql: `
      INSERT INTO ai_jobs (repo_id, user_id, period, source_type, source_id, points, detection_method, period_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (repo_id, source_type, source_id) DO UPDATE SET
        user_id = excluded.user_id,
        points = excluded.points,
        detection_method = excluded.detection_method
      RETURNING *
    `,
    args: [repoId, userId, period, sourceType, sourceId, points, detectionMethod, periodDate],
  });
  return result.rows[0] as unknown as AIJob;
}

export async function getAIJobs(filters: { repoId?: number; period?: string; userId?: number } = {}) {
  let sql = `SELECT aj.*, r.name as repo_name, u.name as user_name FROM ai_jobs aj LEFT JOIN repos r ON aj.repo_id = r.id LEFT JOIN users u ON aj.user_id = u.id WHERE 1=1`;
  const args: any[] = [];

  if (filters.repoId) {
    sql += ` AND aj.repo_id = ?`;
    args.push(filters.repoId);
  }
  if (filters.period) {
    sql += ` AND aj.period = ?`;
    args.push(filters.period);
  }
  if (filters.userId) {
    sql += ` AND aj.user_id = ?`;
    args.push(filters.userId);
  }

  sql += ` ORDER BY aj.created_at DESC`;
  const result = await client.execute({ sql, args });
  return result.rows as unknown as (AIJob & { repo_name: string; user_name: string | null })[];
}

export async function getAIJobsReport(period: string) {
  // Period summary
  const summaryResult = await client.execute({
    sql: `
      SELECT
        COUNT(*) as total_jobs,
        SUM(points) as total_points,
        COUNT(DISTINCT user_id) as total_developers
      FROM ai_jobs
      WHERE period = ?
    `,
    args: [period],
  });

  // Top contributor
  const topResult = await client.execute({
    sql: `
      SELECT u.name, SUM(aj.points) as total_points
      FROM ai_jobs aj
      JOIN users u ON aj.user_id = u.id
      WHERE aj.period = ?
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 1
    `,
    args: [period],
  });

  // By developer breakdown
  const byDeveloperResult = await client.execute({
    sql: `
      SELECT
        u.id as user_id,
        u.name as user_name,
        COUNT(*) as total_jobs,
        SUM(aj.points) as total_points
      FROM ai_jobs aj
      JOIN users u ON aj.user_id = u.id
      WHERE aj.period = ?
      GROUP BY u.id
      ORDER BY total_points DESC
    `,
    args: [period],
  });

  return {
    summary: summaryResult.rows[0] as any,
    topContributor: topResult.rows[0] as any,
    byDeveloper: byDeveloperResult.rows,
  };
}

// AI Queue operations
export async function enqueueForAIDetection(
  repoId: number,
  commitId: number | null,
  branchId: number | null
) {
  const result = await client.execute({
    sql: `
      INSERT INTO ai_detection_queue (repo_id, commit_id, branch_id)
      VALUES (?, ?, ?)
      RETURNING *
    `,
    args: [repoId, commitId, branchId],
  });
  return result.rows[0] as unknown as AIDetectionQueue;
}

export async function acquireQueueItem(itemId: number): Promise<AIDetectionQueue | null> {
  const result = await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET status = 'processing', started_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
      RETURNING *
    `,
    args: [itemId],
  });
  return result.rows[0] as unknown as AIDetectionQueue | null;
}

export async function markQueueCompleted(itemId: number) {
  await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [itemId],
  });
}

export async function markQueueFailed(itemId: number, error: string) {
  await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error = ?
      WHERE id = ?
    `,
    args: [error, itemId],
  });
}

export async function incrementQueueRetry(itemId: number) {
  await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET retry_count = retry_count + 1, status = 'pending'
      WHERE id = ?
    `,
    args: [itemId],
  });
}

export async function getPendingQueueItems(limit: number = 10) {
  const result = await client.execute({
    sql: `
      SELECT q.*, c.message, c.author, c.sha, b.name as branch_name
      FROM ai_detection_queue q
      LEFT JOIN commits c ON q.commit_id = c.id
      LEFT JOIN branches b ON q.branch_id = b.id
      WHERE q.status = 'pending'
      ORDER BY q.created_at ASC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows;
}

export async function cleanupOldQueueItems() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await client.execute({
    sql: `
      DELETE FROM ai_detection_queue
      WHERE status IN ('completed', 'failed') AND completed_at < ?
    `,
    args: [sevenDaysAgo],
  });
}

// AI Keyword operations
export async function getAIKeywords() {
  const result = await client.execute({
    sql: `SELECT * FROM ai_keywords ORDER BY created_at DESC`,
  });
  return result.rows as unknown as AIKeyword[];
}

export async function createAIKeyword(keyword: string) {
  const result = await client.execute({
    sql: `INSERT INTO ai_keywords (keyword) VALUES (?) RETURNING *`,
    args: [keyword.toLowerCase()],
  });
  return result.rows[0] as unknown as AIKeyword;
}

export async function deleteAIKeyword(id: number) {
  await client.execute({
    sql: `DELETE FROM ai_keywords WHERE id = ?`,
    args: [id],
  });
}

export async function toggleAIKeyword(id: number, isActive: boolean) {
  await client.execute({
    sql: `UPDATE ai_keywords SET is_active = ? WHERE id = ?`,
    args: [isActive ? 1 : 0, id],
  });
}

// Helper functions for AI job and queue management
export async function hasExistingJob(sourceType: 'commit' | 'branch', sourceId: number): Promise<boolean> {
  const result = await client.execute({
    sql: `SELECT 1 FROM ai_jobs WHERE source_type = ? AND source_id = ? LIMIT 1`,
    args: [sourceType, sourceId],
  });
  return result.rows.length > 0;
}

export async function deleteQueueItemsForSource(sourceType: 'commit' | 'branch', sourceId: number) {
  if (sourceType === 'commit') {
    await client.execute({
      sql: `DELETE FROM ai_detection_queue WHERE commit_id = ?`,
      args: [sourceId],
    });
  } else {
    await client.execute({
      sql: `DELETE FROM ai_detection_queue WHERE branch_id = ?`,
      args: [sourceId],
    });
  }
}

export async function getBranchById(branchId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM branches WHERE id = ?`,
    args: [branchId],
  });
  return result.rows[0] as unknown as Branch | undefined;
}

export async function getCommitById(commitId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM commits WHERE id = ?`,
    args: [commitId],
  });
  return result.rows[0] as unknown as Commit | undefined;
}

export async function linkCommitToBranch(branchId: number, commitId: number) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO branch_commits (branch_id, commit_id) VALUES (?, ?)`,
    args: [branchId, commitId],
  });
}

export async function getCommitsByBranchId(branchId: number): Promise<Commit[]> {
  const result = await client.execute({
    sql: `
      SELECT c.* FROM commits c
      JOIN branch_commits bc ON c.id = bc.commit_id
      WHERE bc.branch_id = ? AND c.date >= ?
      ORDER BY c.date DESC
    `,
    args: [branchId, AI_CUTOFF_DATE],
  });
  return result.rows as unknown as Commit[];
}

// Code Analysis operations
export async function saveCodeAnalysis(
  repoId: number,
  sourceType: 'commit' | 'branch',
  sourceId: number,
  isAgentic: boolean,
  confidence: number,
  report: CodeAnalysisReport,
  model: string = 'z.ai-4.5-air',
  tokensUsed?: number,
  durationMs?: number
) {
  const result = await client.execute({
    sql: `
      INSERT INTO code_analyses (repo_id, source_type, source_id, is_agentic, confidence, report, model, tokens_used, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (repo_id, source_type, source_id) DO UPDATE SET
        is_agentic = excluded.is_agentic,
        confidence = excluded.confidence,
        report = excluded.report,
        model = excluded.model,
        tokens_used = excluded.tokens_used,
        duration_ms = excluded.duration_ms
      RETURNING *
    `,
    args: [repoId, sourceType, sourceId, isAgentic ? 1 : 0, confidence, JSON.stringify(report), model, tokensUsed || null, durationMs || null],
  });
  return result.rows[0] as unknown as CodeAnalysis;
}

export async function getCodeAnalysis(repoId: number, sourceType: 'commit' | 'branch', sourceId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM code_analyses WHERE repo_id = ? AND source_type = ? AND source_id = ?`,
    args: [repoId, sourceType, sourceId],
  });
  return result.rows[0] as unknown as CodeAnalysis | undefined;
}

export async function getCodeAnalysisById(id: number) {
  const result = await client.execute({
    sql: `SELECT * FROM code_analyses WHERE id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as CodeAnalysis | undefined;
}
