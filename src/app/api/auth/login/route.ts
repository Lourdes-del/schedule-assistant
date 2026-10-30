import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validation";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

interface UserRow {
  id: string;
  password_hash: string;
  password_salt: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonErr("请输入正确的邮箱和密码", 422);

  const { email, password } = parsed.data;
  const user = getDb()
    .prepare(
      "SELECT id, password_hash, password_salt FROM users WHERE email = ?",
    )
    .get(email) as UserRow | undefined;

  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return jsonErr("邮箱或密码错误", 401);
  }

  const session = createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return jsonOk({ ok: true });
}
