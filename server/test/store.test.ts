import { expect, test } from "vitest";
import { createCityStore } from "../src/store.js";

const databaseUrl = "postgres://cardio:cardio@127.0.0.1:54329/cardio_city";

test("a reconnect returns the same cache and the same counters", async () => {
  const first = await createCityStore(databaseUrl, "reconnect");
  await first.remember({
    sessions: [
      {
        id: "old",
        name: "Old run",
        localStart: "2026-01-01T08:00:00",
        durationSeconds: 3600,
        distanceMeters: 10000,
        place: "run",
        zones: [10, 40, 30, 0, 0],
      },
    ],
    tallies: {
      run: {
        count: 4,
        totalSeconds: 14400,
        zoneCounts: { 1: 0, 2: 3, 3: 0, 4: 0, 5: 0 },
        countedIds: ["old", "recent-a", "recent-b", "quiet"],
      },
    },
  });
  await first.close();

  const second = await createCityStore(databaseUrl, "reconnect");
  try {
    expect((await second.cache()).map((session) => session.id)).toEqual(["old"]);
    expect(await second.record("run")).toEqual({
      count: 4,
      totalSeconds: 14400,
      averageSeconds: 3600,
      shares: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
      headline: { zone: 2, share: 1 },
    });
  } finally {
    await second.close();
  }
});
