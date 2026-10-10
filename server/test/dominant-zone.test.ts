import { expect, test } from "vitest";
import { dominantZone } from "../src/dominant-zone.js";

test("the zone with the most seconds is the session's zone", () => {
  expect(dominantZone([10, 40, 30, 0, 0])).toBe(2);
});

test("a tie goes to the higher zone", () => {
  expect(dominantZone([10, 40, 40, 0, 0])).toBe(3);
});

test("all zeroes is no zone", () => {
  expect(dominantZone([0, 0, 0, 0, 0])).toBeNull();
});
