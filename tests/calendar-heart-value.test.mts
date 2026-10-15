import test from "node:test";
import assert from "node:assert/strict";

import { isValidCalendarHeartDate } from "../src/lib/calendarHeartValue.ts";

test("accepts valid calendar dates, including leap days", () => {
  assert.equal(isValidCalendarHeartDate({ year: 2026, month: 9, day: 15 }), true);
  assert.equal(isValidCalendarHeartDate({ year: 2024, month: 1, day: 29 }), true);
});

test("rejects impossible dates and invalid month, day, or year values", () => {
  assert.equal(isValidCalendarHeartDate({ year: 2025, month: 1, day: 29 }), false);
  assert.equal(isValidCalendarHeartDate({ year: 2026, month: 12, day: 1 }), false);
  assert.equal(isValidCalendarHeartDate({ year: 2026, month: 0, day: 0 }), false);
  assert.equal(isValidCalendarHeartDate({ year: 1899, month: 0, day: 1 }), false);
  assert.equal(isValidCalendarHeartDate({ year: 2201, month: 0, day: 1 }), false);
  assert.equal(isValidCalendarHeartDate({ year: 2026, month: 1.2, day: 2 }), false);
  assert.equal(isValidCalendarHeartDate(null), false);
  assert.equal(isValidCalendarHeartDate([]), false);
});
