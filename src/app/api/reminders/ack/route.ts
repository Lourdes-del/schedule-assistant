import { getCurrentUser } from "@/lib/auth";
import { markReminderSent } from "@/lib/reminders";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

/** 标记某条提醒已送达，避免重复弹通知。 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return jsonErr("缺少提醒 ID", 422);

  markReminderSent(user.id, id);
  return jsonOk({ ok: true });
}
