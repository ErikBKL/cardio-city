import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { cityPlaces, type CityPlace, type PlaceSize } from "./city.js";

export const placeColors = {
  pool: "#3d7ea6",
  "open-water": "#1f6f8a",
  indoor: "#c47b3a",
  road: "#8d93a0",
  run: "#3f8f5b",
  strength: "#8a6244",
} as const satisfies Record<CityPlace, string>;

const placeNames = {
  pool: "Pool",
  "open-water": "Open water",
  indoor: "Indoor",
  road: "Road",
  run: "Run",
  strength: "Strength",
} as const satisfies Record<CityPlace, string>;

export function placeName(place: CityPlace): string {
  return placeNames[place];
}

export function createCity(places: readonly PlaceSize[]): Group {
  const city = new Group();
  city.name = "city";

  places.forEach((entry, index) => {
    const box = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: placeColors[entry.place] }),
    );
    box.name = entry.place;
    box.scale.setScalar(entry.size);
    box.position.set((index - (places.length - 1) / 2) * 3, entry.size / 2, 0);
    city.add(box);
  });

  return city;
}

export const bumpDurationMs = 180;
const bumpPeak = 1.15;
const clickSlopPx = 5;

export function bumpedScale(size: number, elapsedMs: number): number {
  if (elapsedMs >= bumpDurationMs) {
    return size;
  }
  const along = Math.min(Math.max(elapsedMs, 0), bumpDurationMs) / bumpDurationMs;
  return size * (bumpPeak - (bumpPeak - 1) * along);
}

export function chosenPlace(movementPx: number, object: Object3D | null): CityPlace | undefined {
  if (movementPx > clickSlopPx) {
    return undefined;
  }
  let current = object;
  while (current !== null) {
    if (isCityPlace(current.name)) {
      return current.name;
    }
    current = current.parent;
  }
  return undefined;
}

function isCityPlace(name: string): name is CityPlace {
  return cityPlaces.some((place) => place === name);
}
