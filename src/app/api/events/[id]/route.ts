import { getCurrentUser } from "@/lib/auth";
import { eventSchema } from "@/lib/validation";
import {
  getEvent,
  updateEvent,
  deleteEvent,
  type EventInput,
} from "@/lib/events";
import { syncReminder } from "@/lib/reminders";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const { id } = await ctx.params;
  const event = getEvent(user.id, id);
  if (!event) return jsonErr("日程不存在", 404);
  return jsonOk({ event });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr(parsed.error.issues[0]?.message ?? "参数错误", 422);
  }

  const d = parsed.data;
  const input: EventInput = {
    title: d.title,
    category: d.category,
    start_at: d.start_at ?? null,
    deadline_at: d.deadline_at ?? null,
    location: d.location ?? null,
    audience: d.audience ?? null,
    signup_method: d.signup_method ?? null,
    description: d.description ?? null,
    uncertain_fields: d.uncertain_fields,
  };

  const event = updateEvent(user.id, id, input);
  if (!event) return jsonErr("日程不存在", 404);

  // 提醒整体替换（syncReminder 内部先清后建；none 即清除）
  syncReminder(
    user.id,
    event,
    d.reminder?.choice ?? "none",
    d.reminder?.custom_minutes,
  );

  return jsonOk({ event: getEvent(user.id, id) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

  const { id } = await ctx.params;
  if (!deleteEvent(user.id, id)) return jsonErr("日程不存在", 404);
  return jsonOk({ ok: true });
}
