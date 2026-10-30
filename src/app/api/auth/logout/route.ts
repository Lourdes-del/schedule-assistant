import { cookies } from "next/headers";
import { deleteSessionByToken, SESSION_COOKIE } from "@/lib/session";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSessionByToken(token);
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return jsonOk({ ok: true });
}
