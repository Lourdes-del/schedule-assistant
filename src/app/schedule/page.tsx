"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { EventCard } from "@/components/EventCard";
import { EventForm, type EventFormValues, type ReminderChoice } from "@/components/EventForm";
import { api } from "@/lib/api";
import type { Event } from "@/lib/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { formatDate } from "@/lib/datetime";
import { inputCls, btnPrimary, btnSecondary } from "@/lib/ui";
import { cn } from "@/lib/cn";

type ModalState = { mode: "create" } | { mode: "edit"; event: Event } | null;

function reminderFromEvent(e: Event): { choice: ReminderChoice; custom_minutes?: number } | null {
  const r = e.reminder;
  const base = e.start_at ?? e.deadline_at;
  if (!r || !r.remind_at || !base) return null;
  const minutes = Math.round(
    (new Date(base).getTime() - new Date(r.remind_at).getTime()) / 60000,
  );
  if (minutes === 1440) return { choice: "1day" };
  if (minutes === 60) return { choice: "1hour" };
  if (minutes === 30) return { choice: "30min" };
  return { choice: "custom", custom_minutes: minutes };
}

export default function SchedulePage() {
  return (
    <RequireAuth>
      <Schedule />
    </RequireAuth>
  );
}

function Schedule() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [modal, setModal] = useState<ModalState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api<{ events: Event[] }>("/api/events");
      setEvents(d.events);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (q.trim()) {
        const kw = q.trim().toLowerCase();
        const hay = [e.title, e.location, e.audience, e.signup_method]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [events, q, category]);

  async function handleSubmit(values: EventFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      if (modal?.mode === "edit") {
        await api(`/api/events/${modal.event.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await api("/api/events", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(event: Event) {
    if (!window.confirm(`确定删除日程「${event.title}」吗？`)) return;
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">日程</h1>
        <button onClick={() => setModal({ mode: "create" })} className={btnPrimary}>
          + 新建日程
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="搜索标题 / 地点 / 对象…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={`${inputCls} w-auto`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">全部类别</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-300 p-0.5">
          <button
            onClick={() => setView("list")}
            className={cn("rounded-md px-3 py-1.5 text-sm", view === "list" ? "bg-indigo-600 text-white" : "text-gray-600")}
          >
            列表
          </button>
          <button
            onClick={() => setView("calendar")}
            className={cn("rounded-md px-3 py-1.5 text-sm", view === "calendar" ? "bg-indigo-600 text-white" : "text-gray-600")}
          >
            日历
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-500">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-gray-500">没有符合条件的日程</p>
      ) : view === "list" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onEdit={() => setModal({ mode: "edit", event: e })}
              onDelete={() => handleDelete(e)}
            />
          ))}
        </div>
      ) : (
        <Calendar events={filtered} />
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-4 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {modal.mode === "edit" ? "编辑日程" : "新建日程"}
            </h2>
            <EventForm
              initial={
                modal.mode === "edit"
                  ? {
                      title: modal.event.title,
                      category: modal.event.category,
                      start_at: modal.event.start_at,
                      deadline_at: modal.event.deadline_at,
                      location: modal.event.location,
                      audience: modal.event.audience,
                      signup_method: modal.event.signup_method,
                      description: modal.event.description,
                    }
                  : undefined
              }
              uncertainFields={modal.mode === "edit" ? modal.event.uncertain_fields : []}
              reminder={modal.mode === "edit" ? reminderFromEvent(modal.event) : null}
              submitting={submitting}
              submitLabel={modal.mode === "edit" ? "保存修改" : "创建"}
              onSubmit={handleSubmit}
              onCancel={() => setModal(null)}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar({ events }: { events: Event[] }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const d = formatDate(e.start_at);
      if (!d) continue;
      const arr = map.get(d) ?? [];
      arr.push(e);
      map.set(d, arr);
    }
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateKey = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const selectedEvents = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className={btnSecondary}>
          ‹ 上月
        </button>
        <span className="font-medium text-gray-900">
          {year} 年 {month + 1} 月
        </span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className={btnSecondary}>
          下月 ›
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
          {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`b-${i}`} />;
            const key = dateKey(d);
            const dayEvents = byDay.get(key) ?? [];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={cn(
                  "min-h-[3.5rem] rounded-lg border p-1 text-left text-xs",
                  dayEvents.length > 0 ? "border-indigo-200 bg-indigo-50" : "border-transparent",
                  isSelected ? "ring-2 ring-indigo-500" : "",
                )}
              >
                <span className="font-medium text-gray-700">{d}</span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div key={e.id} className="truncate rounded bg-white px-1 py-0.5 text-[11px] text-gray-700">
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[11px] text-gray-400">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-gray-900">{selected} 的日程</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-500">当天没有日程</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
