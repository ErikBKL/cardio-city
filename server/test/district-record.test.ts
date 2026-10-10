import { expect, test } from "vitest";
import { districtRecord } from "../src/district-record.js";

test("the record counts every session, and the zone share leaves out a session with no zone", () => {
  const record = districtRecord([
    { durationSeconds: 3600, zones: [10, 40, 30, 0, 0], localStart: "2026-01-01T08:00:00" },
    { durationSeconds: 3600, zones: [0, 50, 10, 0, 0], localStart: "2026-10-01T08:00:00" },
    { durationSeconds: 3600, zones: [5, 40, 20, 0, 0], localStart: "2026-10-02T08:00:00" },
    { durationSeconds: 3600, zones: null, localStart: "2026-10-03T08:00:00" },
  ]);

  expect(record).toEqual({
    count: 4,
    totalSeconds: 14400,
    averageSeconds: 3600,
    shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
    headline: { zone: 2, share: 1 },
  });
});
