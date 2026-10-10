import { once } from "node:events";
import type { Server } from "node:http";
import { expect, test } from "vitest";
import type { Activity, DataFetcher, Sport } from "../src/activity.js";
import { createCityServer } from "../src/city-server.js";
import type { ZoneTimes } from "../src/dominant-zone.js";
import type { DistrictRecordSource } from "../src/district-record.js";

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

test("GET /sessions/:id/zones returns that activity's heart-rate seconds", async () => {
  const fetcher: DataFetcher = {
    async fetchActivities() {
      return [];
    },
  };
  const records: DistrictRecordSource = {
    async fetchHistory() {
      return [];
    },
    async fetchZoneTimes(id) {
      expect(id).toBe("run-9");
      return [5, 10, 80, 20, 0];
    },
  };

  const server = createCityServer(fetcher, until, records);
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/sessions/run-9/zones`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ zones: [5, 10, 80, 20, 0] });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("GET /districts/swim counts pool and open water together", async () => {
  const fetcher: DataFetcher = {
    async fetchActivities() {
      return [];
    },
  };
  const records: DistrictRecordSource = {
    async fetchHistory() {
      return [
        activity("pool", "2026-01-01T08:00:00", "laps", [10, 40, 0, 0, 0]),
        activity("open-water", "2026-06-01T08:00:00", "lake", [0, 30, 10, 0, 0]),
        activity("road", "2026-06-02T08:00:00", "ride", [0, 0, 0, 40, 0]),
      ];
    },
    async fetchZoneTimes() {
      return null;
    },
  };

  const server = createCityServer(fetcher, until, records);
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/districts/swim`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 2,
      totalSeconds: 7200,
      averageSeconds: 3600,
      shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
      headline: { zone: 2, share: 1 },
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("GET /districts/run counts the whole run history", async () => {
  const fetcher: DataFetcher = {
    async fetchActivities() {
      throw new Error("the record reads history, not the six-week city");
    },
  };
  const records: DistrictRecordSource = {
    async fetchHistory() {
      return [
        activity("run", "2026-01-01T08:00:00", "old", [10, 40, 30, 0, 0]),
        activity("run", "2026-10-01T08:00:00", "recent-a", [0, 50, 10, 0, 0]),
        activity("run", "2026-10-02T08:00:00", "recent-b", [5, 40, 20, 0, 0]),
        activity("run", "2026-10-03T08:00:00", "quiet", null),
        activity("road", "2026-01-15T08:00:00", "ride", [0, 0, 10, 50, 5]),
        activity("gravel", "2026-02-01T08:00:00", "gravel", [0, 10, 0, 0, 0]),
      ];
    },
    async fetchZoneTimes() {
      return null;
    },
  };

  const server = createCityServer(fetcher, until, records);
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/districts/run`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      count: 4,
      totalSeconds: 14400,
      averageSeconds: 3600,
      shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
      headline: { zone: 2, share: 1 },
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});

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
