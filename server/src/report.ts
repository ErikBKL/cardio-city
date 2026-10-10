import type { ActivityRange, DataFetcher } from "./activity.js";
import { place, type DistrictPlace } from "./place.js";

const places = [
  "pool",
  "open-water",
  "indoor",
  "road",
  "run",
  "strength",
] as const satisfies readonly DistrictPlace[];

export async function reportActivities(
  fetcher: DataFetcher,
  range: ActivityRange,
): Promise<string> {
  const activities = await fetcher.fetchActivities(range);
  const counts: Record<DistrictPlace | "unplaced" | "race", number> = {
    pool: 0,
    "open-water": 0,
    indoor: 0,
    road: 0,
    run: 0,
    strength: 0,
    unplaced: 0,
    race: 0,
  };

  for (const activity of activities) {
    const placement = place(activity);
    switch (placement.outcome) {
      case "placed":
        counts[placement.place] += 1;
        break;
      case "unplaced":
        counts.unplaced += 1;
        break;
      case "race":
        counts.race += 1;
        break;
    }
  }

  return [
    ...places.map((name) => `${name} ${counts[name]}`),
    `unplaced ${counts.unplaced}`,
    `race ${counts.race}`,
  ].join("\n");
}
