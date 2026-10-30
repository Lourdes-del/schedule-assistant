"use client";

import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Avatar } from "@/components/Avatar";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import type { EventDraft } from "@/lib/types";
import { tzOffsetMinutes, formatDateTime } from "@/lib/datetime";
import { CATEGORY_LABELS } from "@/lib/categories";
import { inputCls, btnPrimary, btnSecondary } from "@/lib/ui";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  event?: EventDraft | null;
  eventStatus?: "pending" | "created";
}

function draftToValues(d: EventDraft): EventFormValues {
  return {
    title: d.title ?? "",
    category: d.category,
    start_at: d.start_at,
    deadline_at: d.deadline_at,
    location: d.location,
    audience: d.audience,
    signup_method: d.signup_method,
    description: d.description,
    uncertain_fields: d.uncertain_fields,
    reminder: { choice: "none" },
  };
}

export default function AssistantPage() {
  return (
    <RequireAuth>
      <Assistant />
    </RequireAuth>
  );
}

function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<Msg | null>(null);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, editMsg]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const d = await api<{ reply: string; event: EventDraft | null }>(
        "/api/chat",
        {
          method: "POST",
          body: JSON.stringify({ message: text, tz_offset_minutes: tzOffsetMinutes() }),
        },
      );
      const aiMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: d.reply,
        event: d.event ?? null,
        eventStatus: d.event ? "pending" : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errText = err instanceof Error ? err.message : "发送失败";
      setError(errText);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "抱歉，出现错误：" + errText,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function confirmEvent(msg: Msg) {
    if (!msg.event) return;
    if (!msg.event.title) {
      setEditMsg(msg);
      return;
    }
    setCreating(true);
    try {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify(draftToValues(msg.event)),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, eventStatus: "created" } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function saveEdited(values: EventFormValues) {
    setCreating(true);
    try {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editMsg?.id ? { ...m, event: null, eventStatus: "created" } : m,
        ),
      );
      setEditMsg(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <Avatar hasAvatar={!!user?.avatar_path} size={40} />
        <div>
          <p className="font-medium text-gray-900">学习助手</p>
          <p className="text-xs text-gray-500">可回答学习问题，也能识别话里的日程</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">
            试试说：“下周三下午在教学楼开组会，提醒我提前一天”
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div className={m.role === "user" ? "max-w-[80%]" : "max-w-[80%]"}>
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl bg-indigo-600 px-4 py-2 text-sm text-white"
                    : "rounded-2xl bg-white px-4 py-2 text-sm text-gray-800 shadow-sm"
                }
              >
                {m.content}
              </div>

              {m.event && m.eventStatus === "pending" && (
                <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
                  <p className="font-medium text-gray-900">检测到日程，是否创建？</p>
                  <ul className="mt-1 space-y-0.5 text-gray-700">
                    <li>标题：{m.event.title || <span className="text-amber-600">待补充</span>}</li>
                    {m.event.start_at && <li>开始：{formatDateTime(m.event.start_at)}</li>}
                    {m.event.deadline_at && <li>截止：{formatDateTime(m.event.deadline_at)}</li>}
                    {m.event.location && <li>地点：{m.event.location}</li>}
                    <li>类别：{CATEGORY_LABELS[m.event.category]}</li>
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => confirmEvent(m)} disabled={creating || !m.event.title} className={btnPrimary}>
                      确认创建
                    </button>
                    <button onClick={() => setEditMsg(m)} disabled={creating} className={btnSecondary}>
                      编辑后创建
                    </button>
                  </div>
                  {!m.event.title && (
                    <p className="mt-1 text-xs text-amber-600">请先「编辑后创建」补充标题。</p>
                  )}
                </div>
              )}

              {m.eventStatus === "created" && (
                <p className="mt-1 text-xs text-green-600">✅ 已创建日程</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 border-t border-gray-200 pt-3">
        <input
          className={inputCls}
          placeholder="输入消息…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} disabled={sending || !input.trim()} className={btnPrimary}>
          {sending ? "…" : "发送"}
        </button>
      </div>

      {editMsg && editMsg.event && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-4 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">编辑并创建日程</h2>
            <EventForm
              initial={{
                title: editMsg.event.title ?? "",
                category: editMsg.event.category,
                start_at: editMsg.event.start_at,
                deadline_at: editMsg.event.deadline_at,
                location: editMsg.event.location,
                audience: editMsg.event.audience,
                signup_method: editMsg.event.signup_method,
                description: editMsg.event.description,
              }}
              uncertainFields={editMsg.event.uncertain_fields}
              submitLabel="创建日程"
              submitting={creating}
              onSubmit={saveEdited}
              onCancel={() => setEditMsg(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
