import type { Activity, Sport } from "./activity.js";

export type DistrictPlace =
  | "pool"
  | "open-water"
  | "indoor"
  | "road"
  | "run"
  | "strength";

export type Placement =
  | { outcome: "placed"; place: DistrictPlace }
  | { outcome: "unplaced" }
  | { outcome: "race" };

const placements = {
  pool: { outcome: "placed", place: "pool" },
  "open-water": { outcome: "placed", place: "open-water" },
  indoor: { outcome: "placed", place: "indoor" },
  road: { outcome: "placed", place: "road" },
  run: { outcome: "placed", place: "run" },
  strength: { outcome: "placed", place: "strength" },
  gravel: { outcome: "unplaced" },
  "mountain-bike": { outcome: "unplaced" },
  cyclocross: { outcome: "unplaced" },
  yoga: { outcome: "unplaced" },
  cardio: { outcome: "unplaced" },
  hiit: { outcome: "unplaced" },
  multisport: { outcome: "race" },
} as const satisfies Record<Sport, Placement>;

export function place(activity: Activity): Placement {
  return placements[activity.sport];
}
