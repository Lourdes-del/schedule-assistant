import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRemindAt,
  choiceToMinutes,
  getReminderBase,
} from "../src/lib/reminders";

test("choiceToMinutes：选项映射", () => {
  assert.equal(choiceToMinutes("1day"), 1440);
  assert.equal(choiceToMinutes("1hour"), 60);
  assert.equal(choiceToMinutes("30min"), 30);
  assert.equal(choiceToMinutes("custom", 90), 90);
  assert.equal(choiceToMinutes("custom"), null);
  assert.equal(choiceToMinutes("none"), null);
});

test("computeRemindAt：提前量计算", () => {
  assert.equal(
    computeRemindAt("2026-11-05T14:00:00.000Z", 1440),
    "2026-11-04T14:00:00.000Z",
  );
  assert.equal(
    computeRemindAt("2026-11-05T14:00:00.000Z", 60),
    "2026-11-05T13:00:00.000Z",
  );
});

test("computeRemindAt：空基准或空提前量返回 null", () => {
  assert.equal(computeRemindAt(null, 1440), null);
  assert.equal(computeRemindAt("2026-11-05T14:00:00.000Z", null), null);
  assert.equal(computeRemindAt("not-a-date", 1440), null);
});

test("getReminderBase：优先开始时间，其次截止时间", () => {
  assert.equal(getReminderBase({ start_at: "A", deadline_at: "B" }), "A");
  assert.equal(getReminderBase({ start_at: null, deadline_at: "B" }), "B");
  assert.equal(getReminderBase({ start_at: null, deadline_at: null }), null);
});
