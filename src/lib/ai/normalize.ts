import { normalizeCategory } from "../categories";
import type { EventDraft } from "../types";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/;

/** 把「用户本地时间」字符串（YYYY-MM-DDTHH:mm）转换为 UTC ISO 字符串。 */
export function localDateTimeToUtc(
  local: string,
  offsetMinutes: number,
): string | null {
  const m = local.trim().match(DATE_TIME);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const ms =
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)) - offsetMinutes * 60000;
  return new Date(ms).toISOString();
}

/** 把「日期」字符串（YYYY-MM-DD）按本地 00:00 转换为 UTC ISO。 */
export function localDateToUtc(
  dateOnly: string,
  offsetMinutes: number,
): string | null {
  const m = dateOnly.trim().match(DATE_ONLY);
  if (!m) return null;
  const [, y, mo, d] = m;
  const ms = Date.UTC(+y, +mo - 1, +d) - offsetMinutes * 60000;
  return new Date(ms).toISOString();
}

export interface NormalizedTime {
  value: string | null;
  /** 该时间存在不确定性（缺时刻、或无法解析）。 */
  uncertain: boolean;
}

/**
 * 归一化 AI 返回的时间字符串。
 * - 空/非字符串 → value null，标记不确定（待补充）。
 * - 仅日期 → 按本地 00:00 存值，但标记不确定（待确认时刻）。
 * - 完整日期时间 → 转 UTC，视为确定。
 */
export function normalizeTime(
  raw: unknown,
  offsetMinutes: number,
): NormalizedTime {
  if (typeof raw !== "string") return { value: null, uncertain: true };
  const s = raw.trim();
  if (!s) return { value: null, uncertain: true };

  if (DATE_ONLY.test(s)) {
    return { value: localDateToUtc(s, offsetMinutes), uncertain: true };
  }
  const v = localDateTimeToUtc(s, offsetMinutes);
  if (!v) return { value: null, uncertain: true };
  return { value: v, uncertain: false };
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

const FIELD_ALIAS: Record<string, string> = {
  start_time: "start_at",
  start: "start_at",
  deadline_time: "deadline_at",
  deadline: "deadline_at",
  end_time: "deadline_at",
};

/**
 * 把 AI 返回的原始草稿字段归一化为可安全入库的 EventDraft：
 * - 类别归一化到合法枚举；
 * - 时间转 UTC；
 * - 缺失/含糊字段汇总进 uncertain_fields（绝不编造）。
 */
export function normalizeEventDraft(
  data: unknown,
  offsetMinutes: number,
): EventDraft {
  const d = (data ?? {}) as Record<string, unknown>;

  const start = normalizeTime(d.start_time, offsetMinutes);
  const deadline = normalizeTime(d.deadline_time, offsetMinutes);

  const title = strOrNull(d.title);
  const location = strOrNull(d.location);
  const audience = strOrNull(d.audience);
  const signupMethod = strOrNull(d.signup_method);
  const description = strOrNull(d.note ?? d.description);

  const uncertain = new Set<string>();
  if (!title) uncertain.add("title");
  if (start.value == null || start.uncertain) uncertain.add("start_at");
  if (deadline.value == null || deadline.uncertain) uncertain.add("deadline_at");
  if (!location) uncertain.add("location");
  if (!audience) uncertain.add("audience");
  if (!signupMethod) uncertain.add("signup_method");

  if (Array.isArray(d.uncertain)) {
    for (const f of d.uncertain) {
      if (typeof f === "string") {
        uncertain.add(FIELD_ALIAS[f] ?? f);
      }
    }
  }

  return {
    title,
    category: normalizeCategory(d.category),
    start_at: start.value,
    deadline_at: deadline.value,
    location,
    audience,
    signup_method: signupMethod,
    description,
    uncertain_fields: [...uncertain],
  };
}

/** 生成本地时间字符串（用于提示词里告知模型「今天」）。 */
export function formatLocalNow(offsetMinutes: number): string {
  const now = new Date(Date.now() + offsetMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(
    now.getUTCDate(),
  )} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
}

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${m}`;
}
