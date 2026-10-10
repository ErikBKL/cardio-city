import { expect, test } from "vitest";
import { createActivityZoneReader, zoneTimes } from "../src/garmin/zone-times.js";

test("a listed run carries its heart-rate seconds", () => {
  expect(
    zoneTimes({
      activityId: 1,
      activityType: { typeKey: "running" },
      hrTimeInZone_1: 5,
      hrTimeInZone_2: 10,
      hrTimeInZone_3: 80,
      hrTimeInZone_4: 20,
      hrTimeInZone_5: 0,
    }),
  ).toEqual([5, 10, 80, 20, 0]);
});

test("a listed ride carries its heart-rate seconds", () => {
  expect(
    zoneTimes({
      activityId: 2,
      activityType: { typeKey: "cycling" },
      hrTimeInZone_1: 0,
      hrTimeInZone_2: 0,
      hrTimeInZone_3: 10,
      hrTimeInZone_4: 50,
      hrTimeInZone_5: 5,
    }),
  ).toEqual([0, 0, 10, 50, 5]);
});

test("a listed swim carries its heart-rate seconds", () => {
  expect(
    zoneTimes({
      activityId: 3,
      activityType: { typeKey: "lap_swimming" },
      hrTimeInZone_1: 100,
      hrTimeInZone_2: 40,
      hrTimeInZone_3: 0,
      hrTimeInZone_4: 0,
      hrTimeInZone_5: 0,
    }),
  ).toEqual([100, 40, 0, 0, 0]);
});

test("a list item with no heart-rate zones has no zone times", () => {
  expect(
    zoneTimes({
      activityId: 4,
      powerTimeInZone_1: 10,
      powerTimeInZone_2: 20,
      powerTimeInZone_3: 30,
      powerTimeInZone_4: 0,
      powerTimeInZone_5: 0,
    }),
  ).toBeNull();
});

test("one activity returns its heart-rate seconds", async () => {
  const reader = createActivityZoneReader(async (id) => {
    expect(id).toBe("swim-1");
    return {
      activityId: 7,
      hrTimeInZone_1: 10,
      hrTimeInZone_2: 40,
      hrTimeInZone_3: 30,
      hrTimeInZone_4: 0,
      hrTimeInZone_5: 0,
    };
  });

  await expect(reader.fetchZoneTimes("swim-1")).resolves.toEqual([10, 40, 30, 0, 0]);
});
