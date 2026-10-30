"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { cardCls } from "@/lib/ui";

interface NoticeRecord {
  id: string;
  raw_text: string;
  created_at: string;
  event_id: string | null;
  event_title: string | null;
}

/** 已保存的通知原文列表，便于事后核对。 */
export function NoticeHistory() {
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api<{ notices: NoticeRecord[] }>("/api/notices");
      setNotices(d.notices);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return null;
  if (notices.length === 0) return null;

  return (
    <section className={cardCls}>
      <h2 className="text-base font-semibold text-gray-900">已保存的通知原文</h2>
      <p className="mt-1 text-xs text-gray-500">点击展开查看原文，便于核对已整理的信息。</p>

      <ul className="mt-3 divide-y divide-gray-100">
        {notices.map((n) => (
          <li key={n.id} className="py-2">
            <button
              onClick={() => setOpen(open === n.id ? null : n.id)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="min-w-0 truncate text-sm text-gray-800">
                {n.event_title ?? "（未关联日程）"}
              </span>
              <span className="shrink-0 text-xs text-gray-400">
                {formatDateTime(n.created_at)}
              </span>
            </button>
            {open === n.id && (
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {n.raw_text}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
