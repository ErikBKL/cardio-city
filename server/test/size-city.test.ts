import { expect, test } from "vitest";
import type { Activity, Sport } from "../src/activity.js";
import { sizeCity } from "../src/size-city.js";

const until = "2026-10-10";

function activity(sport: Sport, localStart: string, id: string): Activity {
  return {
    id,
    name: "Session",
    localStart,
    durationSeconds: 1800,
    distanceMeters: 1000,
    sport,
  };
}

test("twelve runs in six weeks size run at 2 and leave every other place a remnant", () => {
  const activities = [
    ...Array.from({ length: 12 }, (_, index) =>
      activity("run", "2026-10-01T08:00:00", `run-${index}`),
    ),
    activity("run", "2026-08-29T08:00:00", "before-window"),
    activity("gravel", "2026-10-01T09:00:00", "gravel"),
    activity("multisport", "2026-10-01T10:00:00", "race"),
  ];

  expect(sizeCity(activities, until)).toEqual([
    { place: "pool", size: 1 / 12 },
    { place: "open-water", size: 1 / 12 },
    { place: "indoor", size: 1 / 12 },
    { place: "road", size: 1 / 12 },
    { place: "run", size: 2 },
    { place: "strength", size: 1 / 12 },
  ]);
});

test("one session on the first day of the six weeks sizes that place at 1/6", () => {
  expect(sizeCity([activity("run", "2026-08-30T08:00:00", "first")], until)).toEqual([
    { place: "pool", size: 1 / 12 },
    { place: "open-water", size: 1 / 12 },
    { place: "indoor", size: 1 / 12 },
    { place: "road", size: 1 / 12 },
    { place: "run", size: 1 / 6 },
    { place: "strength", size: 1 / 12 },
  ]);
});

test("one session on the last day of the six weeks sizes that place at 1/6", () => {
  expect(sizeCity([activity("strength", "2026-10-10T23:00:00", "last")], until)).toEqual([
    { place: "pool", size: 1 / 12 },
    { place: "open-water", size: 1 / 12 },
    { place: "indoor", size: 1 / 12 },
    { place: "road", size: 1 / 12 },
    { place: "run", size: 1 / 12 },
    { place: "strength", size: 1 / 6 },
  ]);
});

test("pool and indoor are sized apart from open water and road", () => {
  const activities = [
    ...Array.from({ length: 6 }, (_, index) =>
      activity("pool", "2026-10-02T08:00:00", `pool-${index}`),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      activity("indoor", "2026-10-02T09:00:00", `indoor-${index}`),
    ),
  ];

  expect(sizeCity(activities, until)).toEqual([
    { place: "pool", size: 1 },
    { place: "open-water", size: 1 / 12 },
    { place: "indoor", size: 1 },
    { place: "road", size: 1 / 12 },
    { place: "run", size: 1 / 12 },
    { place: "strength", size: 1 / 12 },
  ]);
});
