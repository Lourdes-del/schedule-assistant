import test from "node:test";
import assert from "node:assert/strict";
import {
  noticeExtractionSchema,
  chatResultSchema,
} from "../src/lib/ai/schemas";
import {
  normalizeEventDraft,
  localDateTimeToUtc,
} from "../src/lib/ai/normalize";
import { extractJson } from "../src/lib/ai/json";
import { normalizeCategory } from "../src/lib/categories";

const TZ = 480; // 东八区

test("通知解析结果校验：合法结构通过", () => {
  const ok = noticeExtractionSchema.safeParse({
    title: "数据结构讲座",
    category: "讲座",
    start_time: "2026-11-05T14:00",
    deadline_time: null,
    location: "教学楼 A101",
    audience: "计算机学院",
    signup_method: null,
    uncertain: ["signup_method"],
    note: null,
  });
  assert.equal(ok.success, true);
});

test("通知解析结果校验：字段类型错误被拒绝", () => {
  const bad = noticeExtractionSchema.safeParse({ title: 123, category: "讲座" });
  assert.equal(bad.success, false);
});

test("normalizeEventDraft 不编造信息：缺失字段进 uncertain", () => {
  const draft = normalizeEventDraft({ title: "开会", category: "社团活动" }, TZ);
  assert.equal(draft.location, null);
  assert.ok(draft.uncertain_fields.includes("location"));
  assert.ok(draft.uncertain_fields.includes("start_at"));
  assert.ok(draft.uncertain_fields.includes("audience"));
});

test("normalizeEventDraft：仅日期标记待确认但保留值", () => {
  const draft = normalizeEventDraft(
    { title: "交作业", start_time: "2026-11-05", category: "作业" },
    TZ,
  );
  assert.ok(draft.start_at !== null);
  assert.ok(draft.uncertain_fields.includes("start_at"));
});

test("normalizeEventDraft：完整时间转 UTC", () => {
  assert.equal(localDateTimeToUtc("2026-11-05T14:00", TZ), "2026-11-05T06:00:00.000Z");
});

test("normalizeCategory：中文标签归一化到枚举", () => {
  assert.equal(normalizeCategory("讲座"), "lecture");
  assert.equal(normalizeCategory("社团活动"), "club");
  assert.equal(normalizeCategory("考试"), "exam");
  assert.equal(normalizeCategory("未知"), "other");
});

test("extractJson：从 markdown 代码块提取", () => {
  assert.deepEqual(extractJson('```json\n{"a": 1}\n```'), { a: 1 });
});

test("chatResultSchema：reply 必填，event 可选", () => {
  assert.equal(chatResultSchema.safeParse({ reply: "hi", event: null }).success, true);
  assert.equal(chatResultSchema.safeParse({ event: null }).success, false);
});
