import { expect, test } from "vitest";
import type { PlaceSize, Session } from "../src/city.js";
import { chooseRecord, describeRecord, describeZones } from "../src/record.js";

function session(id: string, localStart: string): Session {
  return {
    id,
    name: id,
    localStart,
    durationSeconds: 1800,
    distanceMeters: 1000,
  };
}

const places: PlaceSize[] = [
  {
    place: "pool",
    size: 1 / 6,
    sessions: [session("pool-early", "2026-10-01T08:00:00")],
  },
  {
    place: "open-water",
    size: 1 / 6,
    sessions: [session("lake", "2026-10-03T09:00:00")],
  },
  {
    place: "indoor",
    size: 1 / 6,
    sessions: [session("trainer", "2026-10-04T07:00:00")],
  },
  {
    place: "road",
    size: 1 / 6,
    sessions: [session("ride", "2026-10-02T18:00:00")],
  },
  {
    place: "run",
    size: 1 / 3,
    sessions: [
      session("morning", "2026-10-01T07:00:00"),
      session("evening", "2026-10-05T19:00:00"),
    ],
  },
  { place: "strength", size: 1 / 12, sessions: [] },
];

test("choosing run lists the runs, newest first, with no filter", () => {
  expect(chooseRecord(places, "run")).toEqual({
    district: "run",
    sessions: [
      session("evening", "2026-10-05T19:00:00"),
      session("morning", "2026-10-01T07:00:00"),
    ],
  });
});

test("choosing the pool filters swim, and choosing swim shows both", () => {
  expect(chooseRecord(places, "pool")).toEqual({
    district: "swim",
    place: "pool",
    sessions: [session("pool-early", "2026-10-01T08:00:00")],
  });
  expect(chooseRecord(places, "swim")).toEqual({
    district: "swim",
    sessions: [
      session("lake", "2026-10-03T09:00:00"),
      session("pool-early", "2026-10-01T08:00:00"),
    ],
  });
});

test("choosing the road filters bike, and choosing bike shows both", () => {
  expect(chooseRecord(places, "road")).toEqual({
    district: "bike",
    place: "road",
    sessions: [session("ride", "2026-10-02T18:00:00")],
  });
  expect(chooseRecord(places, "bike")).toEqual({
    district: "bike",
    sessions: [
      session("trainer", "2026-10-04T07:00:00"),
      session("ride", "2026-10-02T18:00:00"),
    ],
  });
});

test("the run record names the whole history and the main zone", () => {
  expect(
    describeRecord("run", {
      count: 4,
      totalSeconds: 14400,
      averageSeconds: 3600,
      headline: { zone: 2, share: 1 },
    }),
  ).toEqual([
    "4 runs ever recorded.",
    "Total running time of 4 h.",
    "Average session 1 h.",
    "100% of runs with a zone were performed in Z2.",
  ]);
});

test("a session lists the seconds in each heart-rate zone", () => {
  expect(describeZones([5, 10, 80, 20, 0])).toBe("Z1 5 s · Z2 10 s · Z3 80 s · Z4 20 s · Z5 0 s");
});

test("a quiet strength district opens an empty list", () => {
  expect(chooseRecord(places, "strength")).toEqual({
    district: "strength",
    sessions: [],
  });
});
