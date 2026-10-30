import { getCurrentUser } from "@/lib/auth";
import { listDueReminders } from "@/lib/reminders";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

/** 返回当前用户已到点、尚未送达的提醒（供站内提醒 + 浏览器通知轮询）。 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const reminders = listDueReminders(user.id);
  return jsonOk({ reminders });
}
