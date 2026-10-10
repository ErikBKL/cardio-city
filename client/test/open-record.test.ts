import { once } from "node:events";
import type { Server } from "node:http";
import { expect, test } from "vitest";
import type { Activity, DataFetcher, Sport } from "../../server/src/activity.js";
import { createCityServer } from "../../server/src/city-server.js";
import type { ZoneTimes } from "../../server/src/dominant-zone.js";
import type { DistrictRecordSource } from "../../server/src/district-record.js";
import { parseCity } from "../src/city.js";
import { describeRecord, parseRecord, parseZones } from "../src/record.js";

const until = "2026-10-10";

function activity(
  sport: Sport,
  localStart: string,
  id: string,
  zones: ZoneTimes | null,
): Activity & { zones: ZoneTimes | null } {
  return {
    id,
    name: "Session",
    localStart,
    durationSeconds: 3600,
    distanceMeters: 1000,
    sport,
    zones,
  };
}

const history = [
  activity("run", "2026-01-01T08:00:00", "old", [10, 40, 30, 0, 0]),
  activity("run", "2026-10-01T08:00:00", "recent-a", [0, 50, 10, 0, 0]),
  activity("run", "2026-10-02T08:00:00", "recent-b", [5, 40, 20, 0, 0]),
  activity("run", "2026-10-03T08:00:00", "quiet", null),
];

test("opening run reads the whole history while the box stays six weeks", async () => {
  const fetcher: DataFetcher = {
    async fetchActivities() {
      return history;
    },
  };
  const records: DistrictRecordSource = {
    async fetchHistory() {
      return history;
    },
    async fetchZoneTimes(id) {
      return history.find((session) => session.id === id)?.zones ?? null;
    },
  };

  const server = createCityServer(fetcher, until, records);
  const port = await listen(server);
  try {
    const cityResponse = await fetch(`http://127.0.0.1:${port}/city`);
    const places = parseCity(await cityResponse.json());
    const run = places.find((place) => place.place === "run");
    expect(run?.sessions.map((session) => session.id)).toEqual(["quiet", "recent-b", "recent-a"]);

    const recordResponse = await fetch(`http://127.0.0.1:${port}/districts/run`);
    const body: unknown = await recordResponse.json();
    expect(body).toEqual({
      count: 4,
      totalSeconds: 14400,
      averageSeconds: 3600,
      shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
      headline: { zone: 2, share: 1 },
    });
    expect(describeRecord("run", parseRecord(body))).toEqual([
      "4 runs ever recorded.",
      "Total running time of 4 h.",
      "Average session 1 h.",
      "100% of runs with a zone were performed in Z2.",
    ]);

    const zonesResponse = await fetch(`http://127.0.0.1:${port}/sessions/old/zones`);
    expect(parseZones(await zonesResponse.json())).toEqual([10, 40, 30, 0, 0]);
  } finally {
    server.close();
    await once(server, "close");
  }
});

async function listen(server: Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("City server did not bind a port");
  }
  return address.port;
}
