import { once } from "node:events";
import { expect, test } from "vitest";
import type { Activity, ActivityRange, DataFetcher, Sport } from "../src/activity.js";
import { createCityServer } from "../src/city-server.js";

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

test("GET /city sizes the fetcher's activities for the given day", async () => {
  let requested: ActivityRange | undefined;
  const fetcher: DataFetcher = {
    async fetchActivities(range) {
      requested = range;
      return [
        ...Array.from({ length: 12 }, (_, index) =>
          activity(
            "run",
            `2026-10-01T08:${String(index).padStart(2, "0")}:00`,
            `run-${index}`,
          ),
        ),
        activity("run", "2026-08-29T08:00:00", "before-window"),
        activity("gravel", "2026-10-01T09:00:00", "gravel"),
        activity("multisport", "2026-10-01T10:00:00", "race"),
      ];
    },
  };

  const server = createCityServer(fetcher, until);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("City server did not bind a port");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/city`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      places: [
        { place: "pool", size: 1 / 12, sessions: [] },
        { place: "open-water", size: 1 / 12, sessions: [] },
        { place: "indoor", size: 1 / 12, sessions: [] },
        { place: "road", size: 1 / 12, sessions: [] },
        {
          place: "run",
          size: 2,
          sessions: [
            "run-11",
            "run-10",
            "run-9",
            "run-8",
            "run-7",
            "run-6",
            "run-5",
            "run-4",
            "run-3",
            "run-2",
            "run-1",
            "run-0",
          ].map((id, index) => ({
            id,
            name: "Session",
            localStart: `2026-10-01T08:${String(11 - index).padStart(2, "0")}:00`,
            durationSeconds: 1800,
            distanceMeters: 1000,
          })),
        },
        { place: "strength", size: 1 / 12, sessions: [] },
      ],
    });
    expect(requested).toEqual({ since: "2026-08-30", until: "2026-10-10" });
  } finally {
    server.close();
    await once(server, "close");
  }
});
