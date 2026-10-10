import { expect, test } from "vitest";
import { UnrecognizedSportError } from "../src/activity.js";
import { createGarminDataFetcher, zonedActivity } from "../src/garmin/garmin-data-fetcher.js";

const range = { since: "2026-10-01", until: "2026-10-07" };

test("a pool swim becomes a pool activity", async () => {
  const fetcher = createGarminDataFetcher(async () => [
    {
      activityId: 42,
      activityName: "Morning laps",
      startTimeLocal: "2026-10-03 08:15:00",
      duration: 1800,
      distance: 1500,
      activityType: { typeKey: "pool_swim" },
    },
  ]);

  await expect(fetcher.fetchActivities(range)).resolves.toEqual([
    {
      id: "42",
      name: "Morning laps",
      localStart: "2026-10-03T08:15:00",
      durationSeconds: 1800,
      distanceMeters: 1500,
      sport: "pool",
    },
  ]);
});

function listed(typeKey: string, startTimeLocal = "2026-10-03 08:15:00") {
  return {
    activityId: 42,
    activityName: "Session",
    startTimeLocal,
    duration: 1800,
    distance: 1500,
    activityType: { typeKey },
  };
}

test.each([
  ["lap_swimming", "pool"],
  ["open_water_swimming", "open-water"],
  ["indoor_cycling", "indoor"],
  ["virtual_cycling", "indoor"],
  ["road_cycling", "road"],
  ["cycling", "road"],
  ["running", "run"],
  ["street_running", "run"],
  ["trail_running", "run"],
  ["treadmill_running", "run"],
  ["track_running", "run"],
  ["virtual_running", "run"],
  ["indoor_running", "run"],
  ["ultra_running", "run"],
  ["strength_training", "strength"],
  ["gravel_cycling", "gravel"],
  ["mountain_biking", "mountain-bike"],
  ["cyclocross", "cyclocross"],
  ["yoga", "yoga"],
  ["cardio", "cardio"],
  ["indoor_cardio", "cardio"],
  ["hiit", "hiit"],
  ["triathlon", "multisport"],
  ["multi_sport", "multisport"],
  ["duathlon", "multisport"],
  ["swimrun", "multisport"],
] as const)("%s becomes %s", async (typeKey, sport) => {
  const fetcher = createGarminDataFetcher(async () => [listed(typeKey)]);
  const activities = await fetcher.fetchActivities(range);
  expect(activities.map((activity) => activity.sport)).toEqual([sport]);
});

test("a listed run keeps its sport and its heart-rate seconds", () => {
  expect(
    zonedActivity({
      activityId: 9,
      activityName: "Easy",
      startTimeLocal: "2026-01-01 08:00:00",
      duration: 3600,
      distance: 10000,
      activityType: { typeKey: "running" },
      hrTimeInZone_1: 5,
      hrTimeInZone_2: 10,
      hrTimeInZone_3: 80,
      hrTimeInZone_4: 20,
      hrTimeInZone_5: 0,
    }),
  ).toEqual({
    id: "9",
    name: "Easy",
    localStart: "2026-01-01T08:00:00",
    durationSeconds: 3600,
    distanceMeters: 10000,
    sport: "run",
    zones: [5, 10, 80, 20, 0],
  });
});

test("an unrecognized label rejects the fetch", async () => {
  const fetcher = createGarminDataFetcher(async () => [listed("pickleball")]);

  await expect(fetcher.fetchActivities(range)).rejects.toBeInstanceOf(UnrecognizedSportError);
  await expect(fetcher.fetchActivities(range)).rejects.toMatchObject({ label: "pickleball" });
});

test("a session with no distance keeps a zero distance", async () => {
  const fetcher = createGarminDataFetcher(async () => [
    { ...listed("strength_training"), distance: null },
  ]);

  const activities = await fetcher.fetchActivities(range);
  expect(activities.map((activity) => activity.distanceMeters)).toEqual([0]);
});

test("sessions outside the requested dates are left out", async () => {
  const fetcher = createGarminDataFetcher(async () => [
    listed("pool_swim", "2026-09-30 23:59:00"),
    listed("running", "2026-10-01 00:01:00"),
    listed("road_cycling", "2026-10-07 21:00:00"),
    listed("strength_training", "2026-10-08 00:00:00"),
  ]);

  const activities = await fetcher.fetchActivities(range);
  expect(activities.map((activity) => activity.localStart)).toEqual([
    "2026-10-01T00:01:00",
    "2026-10-07T21:00:00",
  ]);
});
