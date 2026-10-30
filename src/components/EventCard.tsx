"use client";

import type { Event } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/categories";
import { FIELD_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/cn";

const CATEGORY_COLORS: Record<string, string> = {
  lecture: "bg-blue-100 text-blue-700",
  exam: "bg-red-100 text-red-700",
  homework: "bg-amber-100 text-amber-700",
  competition: "bg-purple-100 text-purple-700",
  club: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-700",
};

export function EventCard({
  event,
  onEdit,
  onDelete,
  highlight,
}: {
  event: Event;
  onEdit?: () => void;
  onDelete?: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm",
        highlight ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other,
              )}
            >
              {CATEGORY_LABELS[event.category]}
            </span>
            {highlight && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                临近
              </span>
            )}
          </div>
          <h3 className="mt-1 break-words font-medium text-gray-900">
            {event.title}
          </h3>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                编辑
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                删除
              </button>
            )}
          </div>
        )}
      </div>

      <dl className="mt-2 space-y-1 text-sm text-gray-600">
        {event.start_at && <div>开始：{formatDateTime(event.start_at)}</div>}
        {event.deadline_at && <div>截止：{formatDateTime(event.deadline_at)}</div>}
        {event.location && <div>地点：{event.location}</div>}
        {event.audience && <div>对象：{event.audience}</div>}
        {event.signup_method && <div className="break-words">报名：{event.signup_method}</div>}
      </dl>

      {event.reminder && event.reminder.offset_label && (
        <div className="mt-2 text-xs text-gray-500">
          提醒：{event.reminder.offset_label}
          {event.reminder.remind_at &&
            `（${formatDateTime(event.reminder.remind_at)}）`}
          {event.reminder.sent_at ? " · 已提醒" : ""}
        </div>
      )}

      {event.uncertain_fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {event.uncertain_fields.map((f) => (
            <span
              key={f}
              className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-600"
            >
              待确认：{FIELD_LABELS[f] ?? f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
