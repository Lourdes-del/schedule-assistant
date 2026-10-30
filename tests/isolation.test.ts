import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DATABASE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "campus-isolation-")),
  "app.db",
);
process.env.APP_SECRET = "test-secret";

import { getDb } from "../src/lib/db";
import { createEvent, listEvents, getEvent } from "../src/lib/events";
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

test("用户数据隔离：各自只能看到自己的日程", () => {
  const a = makeUser("iso-a@test.com");
  const b = makeUser("iso-b@test.com");

  createEvent(a, baseInput({ title: "A 的日程" }));
  createEvent(b, baseInput({ title: "B 的日程" }));

  const aList = listEvents(a);
  const bList = listEvents(b);
  assert.equal(aList.length, 1);
  assert.equal(bList.length, 1);
  assert.ok(aList.every((e) => e.user_id === a));
  assert.ok(bList.every((e) => e.user_id === b));
});

test("跨用户访问日程返回 null", () => {
  const a = makeUser("iso-c@test.com");
  const b = makeUser("iso-d@test.com");
  const ev = createEvent(a, baseInput({ title: "私有" }));
  assert.equal(getEvent(b, ev.id), null);
});

test("列表查询始终受 user_id 约束（SQL 层隔离）", () => {
  const a = makeUser("iso-e@test.com");
  const b = makeUser("iso-f@test.com");
  createEvent(a, baseInput({ title: "a1" }));
  createEvent(a, baseInput({ title: "a2" }));
  createEvent(b, baseInput({ title: "b1" }));

  assert.equal(listEvents(a).length, 2);
  assert.equal(listEvents(b).length, 1);
});
