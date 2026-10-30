"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { NoticeHistory } from "@/components/NoticeHistory";
import { api } from "@/lib/api";
import type { EventDraft } from "@/lib/types";
import { tzOffsetMinutes } from "@/lib/datetime";
import { cardCls, inputCls, btnPrimary, btnSecondary } from "@/lib/ui";

type Stage = "input" | "parsing" | "result" | "manual" | "saved";

export default function NoticesPage() {
  return (
    <RequireAuth>
      <Notices />
    </RequireAuth>
  );
}

function Notices() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("text");
    if (t) setText(t);
  }, []);

  async function handleParse() {
    if (!text.trim()) {
      setError("请先粘贴通知原文");
      return;
    }
    setError(null);
    setStage("parsing");
    try {
      const d = await api<{ draft: EventDraft; note: string | null }>(
        "/api/notices/parse",
        {
          method: "POST",
          body: JSON.stringify({
            text: text.trim(),
            tz_offset_minutes: tzOffsetMinutes(),
          }),
        },
      );
      setDraft(d.draft);
      setNote(d.note);
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
      setStage("input");
    }
  }

  async function confirmSave(values: EventFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/notices", {
        method: "POST",
        body: JSON.stringify({ raw_text: text.trim(), event: values }),
      });
      setStage("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function manualCreate(values: EventFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setStage("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "saved") {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-medium text-green-800">✅ 已保存</p>
        <p className="mt-1 text-sm text-green-700">日程已加入你的日程表。</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/schedule" className={btnPrimary}>
            查看日程
          </Link>
          <button onClick={() => { setText(""); setDraft(null); setNote(null); setStage("input"); }} className={btnSecondary}>
            继续粘贴
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">通知整理</h1>

      {stage === "input" && (
        <div className={cardCls}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            粘贴通知原文
          </label>
          <textarea
            className={`${inputCls} min-h-[8rem]`}
            placeholder="粘贴学校 / 社团 / 课程通知原文，AI 会提取标题、类别、时间、地点、对象、报名方式…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={handleParse} disabled={!text.trim()} className={btnPrimary}>
              AI 解析
            </button>
            <button onClick={() => setStage("manual")} className={btnSecondary}>
              手动创建（跳过 AI）
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <p className="mt-3 text-xs text-gray-500">
            解析结果需你确认后才会保存；缺失或含糊的信息会标注「待补充 / 待确认」。
          </p>
        </div>
      )}

      {stage === "parsing" && (
        <div className="py-16 text-center text-gray-500">
          <p>AI 正在解析通知…</p>
          <p className="mt-1 text-xs text-gray-400">通常需要几秒钟</p>
        </div>
      )}

      {stage === "result" && draft && (
        <div className={cardCls}>
          <p className="mb-3 text-sm text-gray-600">
            AI 已解析出以下内容，请核对并修改后再保存。
          </p>
          {note && (
            <p className="mb-3 rounded-lg bg-blue-50 p-2 text-sm text-blue-700">
              💡 {note}
            </p>
          )}
          <EventForm
            initial={{
              title: draft.title ?? "",
              category: draft.category,
              start_at: draft.start_at,
              deadline_at: draft.deadline_at,
              location: draft.location,
              audience: draft.audience,
              signup_method: draft.signup_method,
              description: draft.description,
            }}
            uncertainFields={draft.uncertain_fields}
            submitLabel="确认并保存为日程"
            submitting={submitting}
            onSubmit={confirmSave}
            onCancel={() => {
              setDraft(null);
              setNote(null);
              setStage("input");
            }}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {stage === "manual" && (
        <div className={cardCls}>
          <p className="mb-3 text-sm text-gray-600">手动填写日程信息：</p>
          <EventForm
            submitLabel="保存日程"
            submitting={submitting}
            onSubmit={manualCreate}
            onCancel={() => setStage("input")}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {stage === "input" && <NoticeHistory />}
    </div>
  );
}
