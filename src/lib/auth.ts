import { cookies } from "next/headers";
import { SESSION_COOKIE, getUserBySessionToken } from "./session";
import type { User } from "./types";

/** 解析当前登录用户；未登录或会话过期返回 null。 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}
