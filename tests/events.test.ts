import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// 在首次调用 getDb() 之前指定临时数据库路径（模块懒加载，顶层语句先于测试执行）。
process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "campus-events-")),
  "app.db",
);
process.env.APP_SECRET = "test-secret";

import { getDb } from "../src/lib/db";
import {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} from "../src/lib/events";
import { eventSchema, noticeCreateSchema } from "../src/lib/validation";
import { normalizeEventDraft } from "../src/lib/ai/normalize";
import { newId } from "../src/lib/ids";
import type { EventInput } from "../src/lib/events";

function makeUser(email: string): string {
  const id = newId();
  getDb()
    .prepare(
      "INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, email, "tester", "h", "s", new Date().toISOString());
  return id;
}

function baseInput(over: Partial<EventInput> = {}): EventInput {
  return {
    title: "测试日程",
    category: "other",
    start_at: null,
    deadline_at: null,
    location: null,
    audience: null,
    signup_method: null,
    description: null,
    uncertain_fields: [],
    ...over,
  };
}

test("日程创建需先通过校验：拒绝空标题 / 非法类别", () => {
  assert.equal(eventSchema.safeParse({ title: "", category: "other" }).success, false);
  assert.equal(
    eventSchema.safeParse({ title: "x", category: "nonsense" }).success,
    false,
  );
  assert.equal(
    eventSchema.safeParse({ title: "x", category: "lecture" }).success,
    true,
  );
});

test("确认后才创建：解析(normalize)不落库，createEvent 显式写入", () => {
  const user = makeUser(`${newId()}@t.com`);
  const before = listEvents(user).length;

  // 解析是纯函数：即使解析出草稿，也不应写入任何日程。
  normalizeEventDraft({ title: "组会", category: "club" }, 480);
  assert.equal(listEvents(user).length, before, "解析阶段不应自动创建日程");

  const created = createEvent(
    user,
    baseInput({ title: "组会", category: "club", location: "教研室" }),
  );
  assert.equal(created.title, "组会");
  assert.equal(created.notice_id, null);
  assert.equal(listEvents(user).length, before + 1);
});

test("noticeCreateSchema：校验原文与事件字段", () => {
  const ok = noticeCreateSchema.safeParse({
    raw_text: "明天开会",
    event: { title: "开会", category: "club" },
  });
  assert.equal(ok.success, true);
  assert.equal(
    noticeCreateSchema.safeParse({
      raw_text: "",
      event: { title: "开会", category: "club" },
    }).success,
    false,
  );
});

test("updateEvent / deleteEvent 归属校验", () => {
  const u1 = makeUser(`${newId()}@t.com`);
  const u2 = makeUser(`${newId()}@t.com`);
  const ev = createEvent(u1, baseInput({ title: "A" }));

  assert.equal(getEvent(u2, ev.id), null);
  assert.equal(updateEvent(u2, ev.id, baseInput({ title: "B" })), null);
  assert.equal(deleteEvent(u2, ev.id), false);
  assert.ok(getEvent(u1, ev.id), "原用户仍可访问自己的日程");
});
