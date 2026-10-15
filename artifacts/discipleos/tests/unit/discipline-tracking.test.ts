import assert from "node:assert/strict";
import { recentDisciplineOccurrences } from "../../src/lib/discipline-tracking";

export function runDisciplineTrackingFixtures() {
  const today = "2026-01-07";
  const prayer = {
    id: "prayer-daily",
    type: "prayer",
    date: "2026-01-01",
    time: "06:30",
    repeat: "daily",
    repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
    repeatUntil: "",
  };
  const fastingOne = {
    id: "fast-one",
    type: "fast",
    date: "2026-01-04",
    time: "",
    repeat: "none",
    repeatUntil: "",
  };
  const fastingTwo = { ...fastingOne, id: "fast-two", date: "2026-01-06" };
  const completions = {
    "prayer-daily:2026-01-06": true,
    "fast-one:2026-01-04": true,
  };

  const prayerOnly = recentDisciplineOccurrences([prayer], completions, today);
  assert.equal(prayerOnly.length, 7);
  assert.equal(prayerOnly.filter((item) => item.completed).length, 1);
  assert.equal(prayerOnly.find((item) => item.date === today)?.event.time, "06:30");
  assert.equal(recentDisciplineOccurrences([], {}, today).length, 0);

  const fastingOnly = recentDisciplineOccurrences([fastingOne, fastingTwo], completions, today);
  assert.equal(fastingOnly.length, 2);
  assert.ok(fastingOnly.every((item) => item.event.time === ""));
  assert.equal(fastingOnly.filter((item) => item.completed).length, 1);

  const both = recentDisciplineOccurrences([prayer, fastingOne], completions, today);
  assert.equal(both.length, 8);
  assert.equal(
    recentDisciplineOccurrences([prayer, prayer], completions, today).length,
    7,
    "the same event/date identity is counted once",
  );

  const endedPrayer = {
    ...prayer,
    repeat: "weekly",
    repeatWeekdays: [4],
    repeatUntil: "2026-01-03",
  };
  const preservedHistory = recentDisciplineOccurrences(
    [endedPrayer],
    { "prayer-daily:2026-01-02": true },
    today,
  );
  assert.deepEqual(preservedHistory.map((item) => item.date), ["2026-01-02", "2026-01-01"]);
  assert.equal(preservedHistory[0].completed, true);
}
