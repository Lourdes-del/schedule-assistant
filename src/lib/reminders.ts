import { getDb } from "./db";
import { newId } from "./ids";
import type { Reminder } from "./types";

export type ReminderChoice = "none" | "1day" | "1hour" | "30min" | "custom";

export const REMINDER_CHOICE_LABELS: Record<ReminderChoice, string> = {
  none: "不提醒",
  "1day": "提前 1 天",
  "1hour": "提前 1 小时",
  "30min": "提前 30 分钟",
  custom: "自定义",
};

/** 把提醒选项换算为「提前多少分钟」，无法换算返回 null。 */
export function choiceToMinutes(
  choice: ReminderChoice,
  customMinutes?: number,
): number | null {
  switch (choice) {
    case "1day":
      return 24 * 60;
    case "1hour":
      return 60;
    case "30min":
      return 30;
    case "custom":
      return typeof customMinutes === "number" && customMinutes > 0
        ? customMinutes
        : null;
    default:
      return null;
  }
}

/** 计算提醒触发时间 = 基准时间 - 提前量（UTC ISO）。基准或提前量缺失返回 null。 */
export function computeRemindAt(
  baseIso: string | null,
  minutes: number | null,
): string | null {
  if (!baseIso || minutes == null) return null;
  const base = new Date(baseIso).getTime();
  if (Number.isNaN(base)) return null;
  return new Date(base - minutes * 60 * 1000).toISOString();
}

/** 提醒基准：优先开始时间，其次截止时间。 */
export function getReminderBase(event: {
  start_at: string | null;
  deadline_at: string | null;
}): string | null {
  return event.start_at ?? event.deadline_at ?? null;
}

/** 按最新选择同步某日程的提醒（先清后建；选择「不提醒」则删除）。 */
export function syncReminder(
  userId: string,
  event: { id: string; start_at: string | null; deadline_at: string | null },
  choice: ReminderChoice,
  customMinutes?: number,
): void {
  getDb()
    .prepare("DELETE FROM reminders WHERE event_id = ? AND user_id = ?")
    .run(event.id, userId);

  const minutes = choiceToMinutes(choice, customMinutes);
  const remindAt = computeRemindAt(getReminderBase(event), minutes);
  if (!remindAt) return;

  const label =
    choice === "custom"
      ? `提前 ${customMinutes} 分钟`
      : REMINDER_CHOICE_LABELS[choice];
  getDb()
    .prepare(
      `INSERT INTO reminders (id, user_id, event_id, remind_at, offset_label, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(newId(), userId, event.id, remindAt, label, new Date().toISOString());
}

export interface DueReminder extends Reminder {
  event_title: string;
  event_category: string;
  event_start_at: string | null;
  event_deadline_at: string | null;
  event_location: string | null;
}

/** 返回当前用户已到点、尚未通知的提醒（连同所属日程信息）。 */
export function listDueReminders(
  userId: string,
  nowIso: string = new Date().toISOString(),
): DueReminder[] {
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.user_id, r.event_id, r.remind_at, r.offset_label, r.sent_at, r.created_at,
              e.title AS event_title, e.category AS event_category,
              e.start_at AS event_start_at, e.deadline_at AS event_deadline_at,
              e.location AS event_location
       FROM reminders r
       JOIN events e ON e.id = r.event_id
       WHERE r.user_id = ? AND r.sent_at IS NULL AND r.remind_at <= ?
       ORDER BY r.remind_at ASC`,
    )
    .all(userId, nowIso) as unknown as DueReminder[];
  return rows;
}

/** 标记提醒已送达（幂等，仅当尚未送达时更新）。 */
export function markReminderSent(userId: string, id: string): void {
  getDb()
    .prepare(
      "UPDATE reminders SET sent_at = ? WHERE id = ? AND user_id = ? AND sent_at IS NULL",
    )
    .run(new Date().toISOString(), id, userId);
}
