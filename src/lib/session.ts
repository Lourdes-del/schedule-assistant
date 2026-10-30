import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "campus_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 天

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 新建会话，返回明文 token（仅此一次可读，服务端只存其哈希）。 */
export function createSession(userId: string): {
  token: string;
  expiresAt: string;
} {
  const token = randomBytes(32).toString("base64url");
  const id = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString();
  getDb()
    .prepare(
      "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(id, userId, expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

/** 根据明文 token 解析用户；无效或过期返回 null。 */
export function getUserBySessionToken(token: string): User | null {
  const id = hashToken(token);
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.avatar_path, u.avatar_mime, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(id, new Date().toISOString()) as User | undefined;
  return row ?? null;
}

export function deleteSessionByToken(token: string): void {
  getDb()
    .prepare("DELETE FROM sessions WHERE id = ?")
    .run(hashToken(token));
}
