import { expect, test } from "vitest";
import { Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { bumpedScale, chosenPlace, createCity } from "../src/city-scene.js";

test("each place is a box scaled to its size", () => {
  const city = createCity([
    { place: "pool", size: 1 / 12, sessions: [] },
    { place: "open-water", size: 1 / 12, sessions: [] },
    { place: "indoor", size: 1, sessions: [] },
    { place: "road", size: 1 / 12, sessions: [] },
    { place: "run", size: 2, sessions: [] },
    { place: "strength", size: 1 / 6, sessions: [] },
  ]);

  expect(scales(city)).toEqual({
    pool: [1 / 12, 1 / 12, 1 / 12],
    "open-water": [1 / 12, 1 / 12, 1 / 12],
    indoor: [1, 1, 1],
    road: [1 / 12, 1 / 12, 1 / 12],
    run: [2, 2, 2],
    strength: [1 / 6, 1 / 6, 1 / 6],
  });
});

function scales(city: { children: { name: string; scale: { toArray: () => number[] } }[] }) {
  return Object.fromEntries(city.children.map((child) => [child.name, child.scale.toArray()]));
}

test("a hit on a box selects that place, and a drag does not", () => {
  const city = createCity([
    { place: "pool", size: 1 / 12, sessions: [] },
    { place: "open-water", size: 1 / 12, sessions: [] },
    { place: "indoor", size: 1, sessions: [] },
    { place: "road", size: 1 / 12, sessions: [] },
    { place: "run", size: 2, sessions: [] },
    { place: "strength", size: 1 / 6, sessions: [] },
  ]);
  const run = city.getObjectByName("run");
  if (run === undefined) {
    throw new Error("Run is missing from the city");
  }
  const child = new Mesh(new SphereGeometry(1), new MeshBasicMaterial());
  run.add(child);

  expect(chosenPlace(0, child)).toBe("run");
  expect(chosenPlace(20, run)).toBeUndefined();
  expect(chosenPlace(0, city)).toBeUndefined();
});

test("a bump starts larger and returns to the payload size", () => {
  expect(bumpedScale(2, 0)).toBe(2.3);
  expect(bumpedScale(2, 180)).toBe(2);
});
