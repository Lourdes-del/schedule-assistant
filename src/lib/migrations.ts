export interface Migration {
  id: number;
  name: string;
  sql: string;
}

/**
 * 编号递增的迁移列表。每次结构变更追加一项，运行时按 id 顺序、在事务中应用，
 * 并写入 schema_migrations 表以记录已应用的版本（幂等）。
 */
export const migrations: Migration[] = [
  {
    id: 1,
    name: "init",
    sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  avatar_path TEXT,
  avatar_mime TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE notices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  start_at TEXT,
  deadline_at TEXT,
  location TEXT,
  audience TEXT,
  signup_method TEXT,
  description TEXT,
  notice_id TEXT REFERENCES notices(id) ON DELETE SET NULL,
  uncertain_fields TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ai_configs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'deepseek',
  api_key_enc TEXT,
  base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  updated_at TEXT NOT NULL
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  remind_at TEXT NOT NULL,
  offset_label TEXT NOT NULL,
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_user_start ON events(user_id, start_at);
CREATE INDEX idx_events_user_deadline ON events(user_id, deadline_at);
CREATE INDEX idx_reminders_user_due ON reminders(user_id, remind_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_notices_user ON notices(user_id);
`,
  },
];
