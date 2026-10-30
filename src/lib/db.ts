import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { migrations } from "./migrations";

let db: DatabaseSync | null = null;

function dbPath(): string {
  return (
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db")
  );
}

/** 惰性初始化数据库：建目录、开启外键、按顺序应用未执行的迁移（幂等）。 */
export function getDb(): DatabaseSync {
  if (db) return db;

  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const instance = new DatabaseSync(file);
  instance.exec("PRAGMA foreign_keys = ON;");

  instance.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id INTEGER PRIMARY KEY,
       name TEXT NOT NULL,
       applied_at TEXT NOT NULL
     )`,
  );

  const applied = new Set(
    (instance.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map(
      (r) => r.id,
    ),
  );

  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    instance.exec("BEGIN");
    try {
      instance.exec(m.sql);
      instance
        .prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)")
        .run(m.id, m.name, new Date().toISOString());
      instance.exec("COMMIT");
    } catch (err) {
      instance.exec("ROLLBACK");
      throw err;
    }
  }

  db = instance;
  return db;
}
