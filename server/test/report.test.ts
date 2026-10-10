import { expect, test } from "vitest";
import type { Activity, ActivityRange, DataFetcher, Sport } from "../src/activity.js";
import { reportActivities } from "../src/report.js";

const range: ActivityRange = { since: "2026-10-01", until: "2026-10-07" };

function activity(sport: Sport, id: string): Activity {
  return {
    id,
    name: "Session",
    localStart: "2026-10-03T08:00:00",
    durationSeconds: 1800,
    distanceMeters: 1000,
    sport,
  };
}

test("the report counts each place, the unplaced sessions, and the races", async () => {
  const fetcher: DataFetcher = {
    async fetchActivities() {
      return [
        activity("pool", "1"),
        activity("pool", "2"),
        activity("run", "3"),
        activity("yoga", "4"),
        activity("multisport", "5"),
      ];
    },
  };

  await expect(reportActivities(fetcher, range)).resolves.toBe(
    [
      "pool 2",
      "open-water 0",
      "indoor 0",
      "road 0",
      "run 1",
      "strength 0",
      "unplaced 1",
      "race 1",
    ].join("\n"),
  );
});
