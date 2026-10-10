import { once } from "node:events";
import type { Server } from "node:http";
import { expect, test } from "vitest";
import type { Sport } from "../src/activity.js";
import { createStoredCityServer } from "../src/city-server.js";
import type { ZoneTimes } from "../src/dominant-zone.js";
import type { DistrictRecordSource, ZonedActivity } from "../src/district-record.js";
import { createCityStore } from "../src/store.js";

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
    name: "Session",
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

const header = {
  count: 4,
  totalSeconds: 14400,
  averageSeconds: 3600,
  shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
  headline: { zone: 2, share: 1 },
};

test("two opens read the same record, and the skyline leaves out the older run", async () => {
  const store = await createCityStore(databaseUrl, "routes");
  const server = createStoredCityServer(historySource(history), store, until);
  const port = await listen(server);
  try {
    const city = await fetch(`http://127.0.0.1:${port}/city`);
    const body = (await city.json()) as {
      places: { place: string; size: number; sessions: { id: string }[] }[];
    };
    const run = body.places.find((place) => place.place === "run");
    expect(run?.size).toBe(0.5);
    expect(run?.sessions.map((session) => session.id)).toEqual(["quiet", "recent-b", "recent-a"]);

    const first = await fetch(`http://127.0.0.1:${port}/districts/run`);
    expect(await first.json()).toEqual(header);
    const second = await fetch(`http://127.0.0.1:${port}/districts/run`);
    expect(await second.json()).toEqual(header);

    const zones = await fetch(`http://127.0.0.1:${port}/sessions/old/zones`);
    expect(await zones.json()).toEqual({ zones: [10, 40, 30, 0, 0] });
  } finally {
    server.close();
    await once(server, "close");
    await store.close();
  }
});

function historySource(activities: readonly ZonedActivity[]): DistrictRecordSource {
  return {
    async fetchHistory() {
      return activities;
    },
    async fetchZoneTimes() {
      throw new Error("a cached session is read from the store");
    },
  };
}

function listen(server: Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  return once(server, "listening").then(() => {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("City server did not bind a port");
    }
    return address.port;
  });
}
