import { cookies } from "next/headers";
import { registerSchema } from "@/lib/validation";
import { getDb } from "@/lib/db";
import { newId } from "@/lib/ids";
import { hashPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? "参数错误", 422);
  }

  const { email, password, display_name } = parsed.data;
  const exists = getDb().prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return jsonErr("该邮箱已注册，请直接登录", 409);

  const { hash, salt } = hashPassword(password);
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, email, display_name, hash, salt, new Date().toISOString());

  const session = createSession(id);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return jsonOk({ ok: true }, { status: 201 });
}
