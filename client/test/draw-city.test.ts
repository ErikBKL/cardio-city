import { once } from "node:events";
import type { Server } from "node:http";
import { expect, test } from "vitest";
import type { Activity, DataFetcher, Sport } from "../../server/src/activity.js";
import { createCityServer } from "../../server/src/city-server.js";
import { parseCity } from "../src/city.js";
import { createCity } from "../src/city-scene.js";
import { chooseRecord } from "../src/record.js";

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

test("the scene draws the sizes published for a fixture city", async () => {
  const fetcher: DataFetcher = {
    async fetchActivities() {
      return [
        ...Array.from({ length: 12 }, (_, index) =>
          activity("run", "2026-10-01T08:00:00", `run-${index}`),
        ),
        activity("run", "2026-08-29T08:00:00", "before-window"),
        activity("gravel", "2026-10-01T09:00:00", "gravel"),
        activity("multisport", "2026-10-01T10:00:00", "race"),
      ];
    },
  };

  const server = createCityServer(fetcher, until);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/city`);
    expect(response.status).toBe(200);
    const places = parseCity(await response.json());
    expect(places).toEqual([
      { place: "pool", size: 1 / 12, sessions: [] },
      { place: "open-water", size: 1 / 12, sessions: [] },
      { place: "indoor", size: 1 / 12, sessions: [] },
      { place: "road", size: 1 / 12, sessions: [] },
      {
        place: "run",
        size: 2,
        sessions: Array.from({ length: 12 }, (_, index) => ({
          id: `run-${index}`,
          name: "Session",
          localStart: "2026-10-01T08:00:00",
          durationSeconds: 1800,
          distanceMeters: 1000,
        })),
      },
      { place: "strength", size: 1 / 12, sessions: [] },
    ]);

    const city = createCity(places);
    expect(chooseRecord(places, "run")).toEqual({
      district: "run",
      sessions: Array.from({ length: 12 }, (_, index) => ({
        id: `run-${index}`,
        name: "Session",
        localStart: "2026-10-01T08:00:00",
        durationSeconds: 1800,
        distanceMeters: 1000,
      })),
    });
    expect(city.getObjectByName("run")?.scale.toArray()).toEqual([2, 2, 2]);
    expect(city.getObjectByName("pool")?.scale.toArray()).toEqual([1 / 12, 1 / 12, 1 / 12]);
    expect(city.getObjectByName("open-water")?.scale.toArray()).toEqual([1 / 12, 1 / 12, 1 / 12]);
    expect(city.getObjectByName("indoor")?.scale.toArray()).toEqual([1 / 12, 1 / 12, 1 / 12]);
    expect(city.getObjectByName("road")?.scale.toArray()).toEqual([1 / 12, 1 / 12, 1 / 12]);
    expect(city.getObjectByName("strength")?.scale.toArray()).toEqual([1 / 12, 1 / 12, 1 / 12]);
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
