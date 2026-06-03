import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'devlog.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in-progress','done')),
      priority   TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      assignee   TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      completed  INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id             TEXT PRIMARY KEY,
      type           TEXT NOT NULL CHECK (type IN ('prioritize','decompose')),
      input_snapshot TEXT NOT NULL,
      steps          TEXT NOT NULL DEFAULT '[]',
      output         TEXT NOT NULL DEFAULT '{}',
      latency_ms     INTEGER,
      accepted       INTEGER,
      created_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_settings (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      provider    TEXT NOT NULL,
      api_key     TEXT NOT NULL,
      model       TEXT NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS comment_reactions (
      comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
      emoji      TEXT NOT NULL,
      count      INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (comment_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS task_reactions (
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      emoji      TEXT NOT NULL,
      count      INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (task_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      parent_id  TEXT REFERENCES task_comments(id) ON DELETE CASCADE,
      author     TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_integrations (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      provider     TEXT NOT NULL,
      access_token TEXT NOT NULL,
      team_id      TEXT,
      team_name    TEXT,
      authed_user  TEXT,
      created_at   INTEGER NOT NULL,
      UNIQUE(user_id, provider)
    );
  `)

  // Migration: add parent_id to task_comments if needed
  try {
    _db.exec(`ALTER TABLE task_comments ADD COLUMN parent_id TEXT REFERENCES task_comments(id) ON DELETE CASCADE`)
  } catch {}

  // Migration: add assignee column if it doesn't exist yet
  try {
    _db.exec(`ALTER TABLE tasks ADD COLUMN assignee TEXT NOT NULL DEFAULT ''`)
  } catch {
    // Column already exists — ignore
  }

  return _db
}
