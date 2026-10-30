import { getCurrentUser } from "@/lib/auth";
import { eventSchema } from "@/lib/validation";
import { listEvents, createEvent, getEvent, type EventInput } from "@/lib/events";
import { syncReminder } from "@/lib/reminders";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);
  return jsonOk({ events: listEvents(user.id) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonErr("请先登录", 401);

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

  const event = createEvent(user.id, input);
  if (d.reminder && d.reminder.choice !== "none") {
    syncReminder(user.id, event, d.reminder.choice, d.reminder.custom_minutes);
  }

  return jsonOk({ event: getEvent(user.id, event.id) }, { status: 201 });
}
