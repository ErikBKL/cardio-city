import { expect, test } from "vitest";
import type { Sport } from "../src/activity.js";
import { cityWindow } from "../src/size-city.js";
import { createCityStore } from "../src/store.js";
import { syncCity, refreshDistrict } from "../src/sync-city.js";
import type { ZoneTimes } from "../src/dominant-zone.js";
import type { DistrictRecordSource, ZonedActivity } from "../src/district-record.js";

const databaseUrl = "postgres://cardio:cardio@127.0.0.1:54329/cardio_city";
const until = "2026-10-10";

function activity(
  id: string,
  localStart: string,
  zones: ZoneTimes | null,
  sport: Sport = "run",
): ZonedActivity {
  return {
    id,
    name: id,
    localStart,
    durationSeconds: 3600,
    distanceMeters: 10000,
    sport,
    zones,
  };
}

const history = [
  activity("old", "2026-01-01T08:00:00", [10, 40, 30, 0, 0]),
  activity("recent-a", "2026-10-01T08:00:00", [0, 50, 10, 0, 0]),
  activity("recent-b", "2026-10-02T08:00:00", [5, 40, 20, 0, 0]),
  activity("quiet", "2026-10-03T08:00:00", null),
  activity("gravel", "2026-10-04T08:00:00", [0, 10, 0, 0, 0], "gravel"),
];

test("a session older than six weeks is counted once and stays out of the skyline", async () => {
  const store = await createCityStore(databaseUrl, "sync_once");
  const source = historySource(history);
  await syncCity(source, store, until);
  await syncCity(source, store, until);

  expect(await store.record("run")).toEqual({
    count: 4,
    totalSeconds: 14400,
    averageSeconds: 3600,
    shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
    headline: { zone: 2, share: 1 },
  });

  const { since } = cityWindow(until);
  const skyline = (await store.cache()).filter((session) => {
    const date = session.localStart.slice(0, 10);
    return date >= since && date <= until;
  });
  expect(skyline.map((session) => session.id).sort()).toEqual(["quiet", "recent-a", "recent-b"]);
  await store.close();
});

test("a new id raises the run count by one", async () => {
  const store = await createCityStore(databaseUrl, "sync_new");
  await syncCity(historySource(history), store, until);
  await syncCity(
    historySource([...history, activity("extra", "2026-10-05T08:00:00", [10, 40, 0, 0, 0])]),
    store,
    until,
  );

  expect((await store.record("run")).count).toBe(5);
  await store.close();
});

test("refreshing run rebuilds that district and leaves bike", async () => {
  const store = await createCityStore(databaseUrl, "sync_refresh");
  await syncCity(
    historySource([
      activity("run-1", "2026-10-01T08:00:00", [0, 40, 0, 0, 0]),
      activity("ride-1", "2026-10-01T09:00:00", [0, 0, 0, 40, 0], "road"),
    ]),
    store,
    until,
  );
  await refreshDistrict(
    historySource([
      activity("run-1", "2026-10-01T08:00:00", [0, 40, 0, 0, 0]),
      activity("run-2", "2026-10-02T08:00:00", [0, 40, 0, 0, 0]),
      activity("ride-1", "2026-10-01T09:00:00", [0, 0, 0, 40, 0], "road"),
    ]),
    store,
    "run",
    until,
  );

  expect((await store.record("run")).count).toBe(2);
  expect((await store.record("bike")).count).toBe(1);
  await store.close();
});

function historySource(activities: readonly ZonedActivity[]): DistrictRecordSource {
  return {
    async fetchHistory() {
      return activities;
    },
    async fetchZoneTimes(id) {
      return activities.find((activity) => activity.id === id)?.zones ?? null;
    },
  };
}
