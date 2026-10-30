"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";

interface DueItem {
  id: string;
  event_id: string;
  remind_at: string;
  offset_label: string;
  event_title: string;
}

/**
 * 登录后轮询「到点提醒」：站内弹窗始终可用；浏览器通知需用户授权且网页打开。
 * 注意：网站关闭后无法送达任何提醒（本项目不接推送服务）。
 */
export function ReminderPoller() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<DueItem[]>([]);

  useEffect(() => {
    if (!user) return;

    async function poll() {
      try {
        const d = await api<{ reminders: DueItem[] }>("/api/reminders/due");
        const due = d.reminders;
        if (due.length === 0) return;

        setToasts((prev) => [...prev, ...due]);
        for (const r of due) {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("日程提醒", {
                body: `「${r.event_title}」${r.offset_label}`,
              });
            } catch {
              /* ignore */
            }
          }
          try {
            await api("/api/reminders/ack", {
              method: "POST",
              body: JSON.stringify({ id: r.id }),
            });
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* 忽略轮询错误 */
      }
    }

    poll();
    const timer = setInterval(poll, 30_000);
    return () => clearInterval(timer);
  }, [user]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-16 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-indigo-200 bg-white p-3 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">🔔 日程提醒</p>
              <p className="mt-0.5 break-words text-sm text-gray-700">
                {t.event_title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {t.offset_label} · {formatDateTime(t.remind_at)}
              </p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
