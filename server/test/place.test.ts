import { expect, test } from "vitest";
import type { Activity, Sport } from "../src/activity.js";
import { place } from "../src/place.js";

function activity(sport: Sport): Activity {
  return {
    id: "1",
    name: "Session",
    localStart: "2026-10-01T08:00:00",
    durationSeconds: 3600,
    distanceMeters: 1000,
    sport,
  };
}

test("a pool session is placed in the pool", () => {
  expect(place(activity("pool"))).toEqual({ outcome: "placed", place: "pool" });
});

test("an open-water session is placed in open water", () => {
  expect(place(activity("open-water"))).toEqual({
    outcome: "placed",
    place: "open-water",
  });
});

test("an indoor session is placed indoors", () => {
  expect(place(activity("indoor"))).toEqual({ outcome: "placed", place: "indoor" });
});

test("a road session is placed on the road", () => {
  expect(place(activity("road"))).toEqual({ outcome: "placed", place: "road" });
});

test("a run session is placed in run", () => {
  expect(place(activity("run"))).toEqual({ outcome: "placed", place: "run" });
});

test("a strength session is placed in strength", () => {
  expect(place(activity("strength"))).toEqual({
    outcome: "placed",
    place: "strength",
  });
});

test.each([
  "gravel",
  "mountain-bike",
  "cyclocross",
  "yoga",
  "cardio",
  "hiit",
] as const)("a %s session stays unplaced", (sport) => {
  expect(place(activity(sport))).toEqual({ outcome: "unplaced" });
});

test("a multisport session is a race and adds no hit", () => {
  expect(place(activity("multisport"))).toEqual({ outcome: "race" });
});
