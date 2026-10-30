import { getDb } from "./db";
import { newId } from "./ids";
import type { Event } from "./types";
import type { Category } from "./categories";

/** 创建/更新日程的输入（不含提醒；提醒由调用方通过 syncReminder 单独处理）。 */
export interface EventInput {
  title: string;
  category: Category;
  start_at: string | null;
  deadline_at: string | null;
  location: string | null;
  audience: string | null;
  signup_method: string | null;
  description: string | null;
  uncertain_fields: string[];
  notice_id?: string | null;
}

interface EventRow {
  id: string;
  user_id: string;
  title: string;
  category: string;
  start_at: string | null;
  deadline_at: string | null;
  location: string | null;
  audience: string | null;
  signup_method: string | null;
  description: string | null;
  notice_id: string | null;
  uncertain_fields: string;
  created_at: string;
  updated_at: string;
  remind_at: string | null;
  offset_label: string | null;
  sent_at: string | null;
}

function parseStringArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    category: row.category as Category,
    start_at: row.start_at,
    deadline_at: row.deadline_at,
    location: row.location,
    audience: row.audience,
    signup_method: row.signup_method,
    description: row.description,
    notice_id: row.notice_id,
    uncertain_fields: parseStringArray(row.uncertain_fields),
    created_at: row.created_at,
    updated_at: row.updated_at,
    reminder: row.remind_at
      ? { remind_at: row.remind_at, offset_label: row.offset_label, sent_at: row.sent_at }
      : null,
  };
}

const SELECT_EVENT = `
  SELECT e.*, r.remind_at, r.offset_label, r.sent_at
  FROM events e
  LEFT JOIN reminders r ON r.event_id = e.id
`;

/** 创建日程并返回（提醒字段此时为空，需另行 syncReminder）。 */
export function createEvent(userId: string, input: EventInput): Event {
  const id = newId();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO events
         (id, user_id, title, category, start_at, deadline_at, location,
          audience, signup_method, description, notice_id, uncertain_fields,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      userId,
      input.title,
      input.category,
      input.start_at,
      input.deadline_at,
      input.location,
      input.audience,
      input.signup_method,
      input.description,
      input.notice_id ?? null,
      JSON.stringify(input.uncertain_fields ?? []),
      now,
      now,
    );
  return getEvent(userId, id)!;
}

/** 列出当前用户所有日程（含单条提醒）。 */
export function listEvents(userId: string): Event[] {
  const rows = getDb()
    .prepare(
      `${SELECT_EVENT}
       WHERE e.user_id = ?
       ORDER BY (e.start_at IS NULL AND e.deadline_at IS NULL) ASC,
                COALESCE(e.start_at, e.deadline_at) ASC`,
    )
    .all(userId) as unknown as EventRow[];
  return rows.map(rowToEvent);
}

export function getEvent(userId: string, id: string): Event | null {
  const row = getDb()
    .prepare(`${SELECT_EVENT} WHERE e.user_id = ? AND e.id = ?`)
    .get(userId, id) as EventRow | undefined;
  return row ? rowToEvent(row) : null;
}

/** 更新日程；非属主或不存在返回 null。 */
export function updateEvent(
  userId: string,
  id: string,
  input: EventInput,
): Event | null {
  const existing = getEvent(userId, id);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE events SET
         title = ?, category = ?, start_at = ?, deadline_at = ?, location = ?,
         audience = ?, signup_method = ?, description = ?, uncertain_fields = ?,
         updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      input.title,
      input.category,
      input.start_at,
      input.deadline_at,
      input.location,
      input.audience,
      input.signup_method,
      input.description,
      JSON.stringify(input.uncertain_fields ?? []),
      new Date().toISOString(),
      id,
      userId,
    );
  return getEvent(userId, id);
}

/** 删除日程；非属主或不存在返回 false。 */
export function deleteEvent(userId: string, id: string): boolean {
  const r = getDb()
    .prepare("DELETE FROM events WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return Number(r.changes) > 0;
}
