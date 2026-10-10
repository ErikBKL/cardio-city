import type { Activity, ActivityRange } from "./activity.js";
import { place, type DistrictPlace } from "./place.js";

export type CitySize = {
  place: DistrictPlace;
  size: number;
};

const places = [
  "pool",
  "open-water",
  "indoor",
  "road",
  "run",
  "strength",
] as const satisfies readonly DistrictPlace[];

const windowDays = 42;
const sessionsPerWeek = 6;
const remnant = 1 / 12;

export function cityWindow(until: string): ActivityRange {
  return { since: shiftDate(until, 1 - windowDays), until };
}

export function sizeCity(activities: readonly Activity[], until: string): CitySize[] {
  const { since } = cityWindow(until);
  const counts = {
    pool: 0,
    "open-water": 0,
    indoor: 0,
    road: 0,
    run: 0,
    strength: 0,
  } satisfies Record<DistrictPlace, number>;

  for (const activity of activities) {
    const date = activity.localStart.slice(0, 10);
    if (date < since || date > until) {
      continue;
    }
    const placement = place(activity);
    if (placement.outcome === "placed") {
      counts[placement.place] += 1;
    }
  }

  return places.map((placeName) => ({
    place: placeName,
    size: counts[placeName] === 0 ? remnant : counts[placeName] / sessionsPerWeek,
  }));
}

function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Unreadable date: ${isoDate}`);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
