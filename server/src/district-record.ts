import type { Activity } from "./activity.js";
import { dominantZone, type Zone, type ZoneTimes } from "./dominant-zone.js";
import { place, type DistrictPlace } from "./place.js";

export const districts = ["swim", "bike", "run", "strength"] as const;

export type District = (typeof districts)[number];

export type ZonedActivity = Activity & {
  zones: ZoneTimes | null;
};

export type DistrictRecordSource = {
  fetchHistory(): Promise<readonly ZonedActivity[]>;
  fetchZoneTimes(id: string): Promise<ZoneTimes | null>;
};

const districtOf = {
  pool: "swim",
  "open-water": "swim",
  indoor: "bike",
  road: "bike",
  run: "run",
  strength: "strength",
} as const satisfies Record<DistrictPlace, District>;

export function isDistrict(value: string): value is District {
  return districts.some((district) => district === value);
}

export function inDistrict(activity: Activity, district: District): boolean {
  return districtFor(activity) === district;
}

export function districtFor(activity: Activity): District | undefined {
  const placement = place(activity);
  if (placement.outcome !== "placed") {
    return undefined;
  }
  return districtOf[placement.place];
}

export type RecordedSession = {
  durationSeconds: number;
  zones: ZoneTimes | null;
  localStart: string;
};

export type ZoneShares = Record<Zone, number>;

export type DistrictRecord = {
  count: number;
  totalSeconds: number;
  averageSeconds: number;
  shares: ZoneShares;
  headline: { zone: Zone; share: number } | null;
};

const zones = [1, 2, 3, 4, 5] as const satisfies readonly Zone[];

export function districtRecord(sessions: readonly RecordedSession[]): DistrictRecord {
  let totalSeconds = 0;
  const counts: ZoneShares = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const session of sessions) {
    totalSeconds += session.durationSeconds;
    if (session.zones === null) {
      continue;
    }
    const zone = dominantZone(session.zones);
    if (zone === null) {
      continue;
    }
    counts[zone] += 1;
  }

  return recordFromCounts(sessions.length, totalSeconds, counts);
}

export function recordFromCounts(
  count: number,
  totalSeconds: number,
  zoneCounts: ZoneShares,
): DistrictRecord {
  const zoned = zones.reduce((sum, zone) => sum + zoneCounts[zone], 0);
  const shares: ZoneShares = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const zone of zones) {
    shares[zone] = zoned === 0 ? 0 : zoneCounts[zone] / zoned;
  }

  return {
    count,
    totalSeconds,
    averageSeconds: count === 0 ? 0 : totalSeconds / count,
    shares,
    headline: headlineShare(shares),
  };
}

function headlineShare(shares: ZoneShares): { zone: Zone; share: number } | null {
  let headline: { zone: Zone; share: number } | null = null;
  for (const zone of zones) {
    const share = shares[zone];
    if (share === 0) {
      continue;
    }
    if (headline === null || share >= headline.share) {
      headline = { zone, share };
    }
  }
  return headline;
}
