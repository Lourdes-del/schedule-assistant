"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { Event } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { cardCls, inputCls, btnPrimary } from "@/lib/ui";

function todayStr(): string {
  return formatDate(new Date().toISOString());
}

export default function HomePage() {
  return (
    <RequireAuth>
      <Home />
    </RequireAuth>
  );
}

function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [paste, setPaste] = useState("");

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

  const { today, deadlines, upcoming } = useMemo(() => {
    const now = Date.now();
    const today = todayStr();
    const todayEvents = events.filter(
      (e) => formatDate(e.start_at) === today || formatDate(e.deadline_at) === today,
    );

    const deadlines = events
      .filter((e) => e.deadline_at)
      .sort(
        (a, b) =>
          new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime(),
      );

    const upcoming = events
      .filter((e) => e.start_at && new Date(e.start_at).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime(),
      )
      .slice(0, 5);

    return { today: todayEvents, deadlines, upcoming };
  }, [events]);

  function goParse() {
    const text = paste.trim();
    if (!text) {
      router.push("/notices");
    } else {
      router.push(`/notices?text=${encodeURIComponent(text)}`);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            你好，{user?.display_name}
          </h1>
          <p className="text-sm text-gray-500">{todayStr()}</p>
        </div>
      </section>

      <section className={cardCls}>
        <h2 className="text-sm font-medium text-gray-900">快速粘贴通知</h2>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <textarea
            className={`${inputCls} min-h-[4rem] flex-1`}
            placeholder="粘贴学校 / 社团 / 课程通知原文，AI 帮你提取成日程…"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button onClick={goParse} className={`${btnPrimary} sm:self-end`}>
            解析通知
          </button>
        </div>
      </section>

      {loading ? (
        <p className="py-8 text-center text-gray-500">加载中…</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          还没有日程。去{" "}
          <Link href="/notices" className="text-indigo-600 hover:underline">
            粘贴通知
          </Link>{" "}
          或{" "}
          <Link href="/schedule" className="text-indigo-600 hover:underline">
            手动创建
          </Link>
          。
        </div>
      ) : (
        <>
          <Section title="今日安排" empty="今天没有安排">
            {today.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {today.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </Section>

          <Section title="近期截止" empty="暂无临近截止的事项">
            {deadlines.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-3">
                {deadlines.slice(0, 6).map((e) => {
                  const overdue =
                    new Date(e.deadline_at!).getTime() < Date.now();
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {e.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          截止 {formatDateTime(e.deadline_at)}
                        </p>
                      </div>
                      <span
                        className={
                          overdue
                            ? "shrink-0 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                            : "shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                        }
                      >
                        {overdue ? "已截止" : "临近"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="即将开始" empty="暂无即将开始的事项">
            {upcoming.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-4 text-sm text-gray-400">暂无内容</p>;
}
