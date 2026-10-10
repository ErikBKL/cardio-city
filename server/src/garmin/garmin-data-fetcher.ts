import {
  UnrecognizedSportError,
  type Activity,
  type ActivityRange,
  type DataFetcher,
  type Sport,
} from "../activity.js";

export function createGarminDataFetcher(
  list: (range: ActivityRange) => Promise<unknown[]>,
): DataFetcher {
  return {
    async fetchActivities(range) {
      const rawActivities = await list(range);
      const activities: Activity[] = [];

      for (const raw of rawActivities) {
        const activity = toActivity(raw);
        if (inRange(activity.localStart, range)) {
          activities.push(activity);
        }
      }

      return activities;
    },
  };
}

function toActivity(raw: unknown): Activity {
  if (!isRecord(raw)) {
    throw new Error("Activity payload is not an object");
  }

  return {
    id: activityId(raw),
    name: requiredString(raw, "activityName"),
    localStart: localStart(requiredString(raw, "startTimeLocal")),
    durationSeconds: requiredNumber(raw, "duration"),
    distanceMeters: distanceMeters(raw),
    sport: sportFor(typeKey(raw)),
  };
}

const sports = {
  pool_swim: "pool",
  lap_swimming: "pool",
  open_water_swimming: "open-water",
  indoor_cycling: "indoor",
  virtual_cycling: "indoor",
  road_cycling: "road",
  cycling: "road",
  running: "run",
  street_running: "run",
  trail_running: "run",
  treadmill_running: "run",
  track_running: "run",
  virtual_running: "run",
  indoor_running: "run",
  ultra_running: "run",
  strength_training: "strength",
  gravel_cycling: "gravel",
  mountain_biking: "mountain-bike",
  cyclocross: "cyclocross",
  yoga: "yoga",
  cardio: "cardio",
  indoor_cardio: "cardio",
  hiit: "hiit",
  triathlon: "multisport",
  duathlon: "multisport",
  swimrun: "multisport",
} as const satisfies Record<string, Sport>;

function sportFor(label: string): Sport {
  if (!isKnownLabel(label)) {
    throw new UnrecognizedSportError(label);
  }
  return sports[label];
}

function isKnownLabel(label: string): label is keyof typeof sports {
  return Object.hasOwn(sports, label);
}

function inRange(localStart: string, range: ActivityRange): boolean {
  const date = localStart.slice(0, 10);
  return date >= range.since && date <= range.until;
}

function localStart(startTimeLocal: string): string {
  return startTimeLocal.includes("T") ? startTimeLocal : startTimeLocal.replace(" ", "T");
}

function typeKey(record: Record<string, unknown>): string {
  const activityType = record["activityType"];
  if (!isRecord(activityType)) {
    throw new Error("Activity is missing activityType");
  }
  return requiredString(activityType, "typeKey");
}

function activityId(record: Record<string, unknown>): string {
  const value = record["activityId"];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error("Activity is missing activityId");
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Activity is missing ${key}`);
  }
  return value;
}

function distanceMeters(record: Record<string, unknown>): number {
  const value = record["distance"];
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Activity is missing distance");
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Activity is missing ${key}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
