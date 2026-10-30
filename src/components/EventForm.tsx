"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import { toDatetimeLocal, fromDatetimeLocal } from "@/lib/datetime";
import { inputCls, labelCls, btnPrimary, btnSecondary } from "@/lib/ui";
import { FIELD_LABELS } from "@/lib/types";

export type ReminderChoice = "none" | "1day" | "1hour" | "30min" | "custom";

export interface EventFormValues {
  title: string;
  category: Category;
  start_at: string | null;
  deadline_at: string | null;
  location: string | null;
  audience: string | null;
  signup_method: string | null;
  description: string | null;
  uncertain_fields: string[];
  reminder: { choice: ReminderChoice; custom_minutes?: number };
}

export interface EventFormInitial {
  title?: string;
  category?: Category;
  start_at?: string | null;
  deadline_at?: string | null;
  location?: string | null;
  audience?: string | null;
  signup_method?: string | null;
  description?: string | null;
}

const REMINDER_OPTIONS: { value: ReminderChoice; label: string }[] = [
  { value: "none", label: "不提醒" },
  { value: "1day", label: "提前 1 天" },
  { value: "1hour", label: "提前 1 小时" },
  { value: "30min", label: "提前 30 分钟" },
  { value: "custom", label: "自定义（分钟）" },
];

const FIELDS = [
  "title",
  "start_at",
  "deadline_at",
  "location",
  "audience",
  "signup_method",
] as const;

export function EventForm({
  initial,
  uncertainFields,
  reminder,
  submitLabel = "保存",
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: EventFormInitial;
  uncertainFields?: string[];
  reminder?: { choice: ReminderChoice; custom_minutes?: number } | null;
  submitLabel?: string;
  submitting?: boolean;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "other");
  const [startLocal, setStartLocal] = useState(toDatetimeLocal(initial?.start_at));
  const [deadlineLocal, setDeadlineLocal] = useState(toDatetimeLocal(initial?.deadline_at));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [signup, setSignup] = useState(initial?.signup_method ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [reminderChoice, setReminderChoice] = useState<ReminderChoice>(
    reminder?.choice ?? "none",
  );
  const [customMinutes, setCustomMinutes] = useState<number>(
    reminder?.custom_minutes ?? 60,
  );
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState<Set<string>>(
    () => new Set(uncertainFields ?? []),
  );

  function touch(field: string, value: string) {
    if (value && value.trim()) {
      setUncertain((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  }

  function isEmpty(field: string): boolean {
    switch (field) {
      case "title":
        return !title.trim();
      case "start_at":
        return !startLocal;
      case "deadline_at":
        return !deadlineLocal;
      case "location":
        return !location.trim();
      case "audience":
        return !audience.trim();
      case "signup_method":
        return !signup.trim();
      default:
        return false;
    }
  }

  function badge(field: string) {
    if (isEmpty(field)) {
      return (
        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
          待补充
        </span>
      );
    }
    if (uncertain.has(field)) {
      return (
        <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
          待确认
        </span>
      );
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("请填写标题");
      return;
    }
    if (reminderChoice === "custom" && (!customMinutes || customMinutes < 1)) {
      setError("请填写有效的自定义提醒分钟数");
      return;
    }

    const uncertainFieldsFinal: string[] = [];
    for (const f of FIELDS) {
      if (isEmpty(f) || uncertain.has(f)) uncertainFieldsFinal.push(f);
    }

    const values: EventFormValues = {
      title: title.trim(),
      category,
      start_at: fromDatetimeLocal(startLocal),
      deadline_at: fromDatetimeLocal(deadlineLocal),
      location: location.trim() || null,
      audience: audience.trim() || null,
      signup_method: signup.trim() || null,
      description: description.trim() || null,
      uncertain_fields: uncertainFieldsFinal,
      reminder:
        reminderChoice === "custom"
          ? { choice: reminderChoice, custom_minutes: customMinutes }
          : { choice: reminderChoice },
    };
    await onSubmit(values);
  }

  function Field({
    field,
    children,
  }: {
    field: string;
    children: React.ReactNode;
  }) {
    return (
      <div>
        <label className={labelCls}>
          {FIELD_LABELS[field] ?? field}
          {badge(field)}
        </label>
        {children}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field field="title">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            touch("title", e.target.value);
          }}
          placeholder="例如：数据结构讲座 / 高数期中考试"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>类别</label>
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>提醒</label>
          <select
            className={inputCls}
            value={reminderChoice}
            onChange={(e) => setReminderChoice(e.target.value as ReminderChoice)}
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {reminderChoice === "custom" && (
        <div>
          <label className={labelCls}>提前多少分钟</label>
          <input
            type="number"
            className={inputCls}
            value={customMinutes}
            min={1}
            onChange={(e) => setCustomMinutes(Number(e.target.value))}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field field="start_at">
          <input
            type="datetime-local"
            className={inputCls}
            value={startLocal}
            onChange={(e) => {
              setStartLocal(e.target.value);
              touch("start_at", e.target.value);
            }}
          />
        </Field>
        <Field field="deadline_at">
          <input
            type="datetime-local"
            className={inputCls}
            value={deadlineLocal}
            onChange={(e) => {
              setDeadlineLocal(e.target.value);
              touch("deadline_at", e.target.value);
            }}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field field="location">
          <input
            className={inputCls}
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              touch("location", e.target.value);
            }}
            placeholder="例如：教学楼 A101"
          />
        </Field>
        <Field field="audience">
          <input
            className={inputCls}
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value);
              touch("audience", e.target.value);
            }}
            placeholder="例如：计算机学院全体"
          />
        </Field>
      </div>

      <Field field="signup_method">
        <input
          className={inputCls}
          value={signup}
          onChange={(e) => {
            setSignup(e.target.value);
            touch("signup_method", e.target.value);
          }}
          placeholder="例如：扫码报名 / 邮件报名 / 无需报名"
        />
      </Field>

      <div>
        <label className={labelCls}>备注</label>
        <textarea
          className={inputCls}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <p className="text-xs text-gray-500">
        提醒基于「开始时间」（无开始时间则用截止时间）；浏览器通知仅在网页打开时可用。
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? "保存中…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btnSecondary}>
            取消
          </button>
        )}
      </div>
    </form>
  );
}
