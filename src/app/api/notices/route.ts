import { getCurrentUser } from "@/lib/auth";
import { noticeCreateSchema } from "@/lib/validation";
import { getDb } from "@/lib/db";
import { newId } from "@/lib/ids";
import { createEvent, getEvent, type EventInput } from "@/lib/events";
import { syncReminder } from "@/lib/reminders";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

// 列出当前用户保存的通知原文（含关联日程标题），供事后核对。
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const rows = getDb()
    .prepare(
      `SELECT n.id, n.raw_text, n.created_at, e.id AS event_id, e.title AS event_title
       FROM notices n
       LEFT JOIN events e ON e.notice_id = n.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC`,
    )
    .all(user.id);

  return jsonOk({ notices: rows });
}

// 确认保存通知：原子地保存原文（notices）+ 创建日程（events）+ 同步提醒。
// 仅用户在确认页点击「确认并保存为日程」后才走到这里；解析阶段不落库。
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const body = await req.json().catch(() => null);
  const parsed = noticeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? "参数错误", 422);
  }

  const { raw_text, event: ev } = parsed.data;

  // 1) 保存通知原文
  const noticeId = newId();
  getDb()
    .prepare("INSERT INTO notices (id, user_id, raw_text, created_at) VALUES (?, ?, ?, ?)")
    .run(noticeId, user.id, raw_text, new Date().toISOString());

  // 2) 创建日程（关联通知原文）
  const input: EventInput = {
    title: ev.title,
    category: ev.category,
    start_at: ev.start_at ?? null,
    deadline_at: ev.deadline_at ?? null,
    location: ev.location ?? null,
    audience: ev.audience ?? null,
    signup_method: ev.signup_method ?? null,
    description: ev.description ?? null,
    uncertain_fields: ev.uncertain_fields,
    notice_id: noticeId,
  };
  const event = createEvent(user.id, input);

  // 3) 同步提醒
  if (ev.reminder && ev.reminder.choice !== "none") {
    syncReminder(user.id, event, ev.reminder.choice, ev.reminder.custom_minutes);
  }

  return jsonOk({ event: getEvent(user.id, event.id) }, { status: 201 });
}
