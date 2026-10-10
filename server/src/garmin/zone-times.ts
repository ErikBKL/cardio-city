import type { ZoneTimes } from "../dominant-zone.js";

const zoneFields = [
  "hrTimeInZone_1",
  "hrTimeInZone_2",
  "hrTimeInZone_3",
  "hrTimeInZone_4",
  "hrTimeInZone_5",
] as const;

export type ActivityZoneReader = {
  fetchZoneTimes(id: string): Promise<ZoneTimes | null>;
};

export function createActivityZoneReader(
  readActivity: (id: string) => Promise<unknown>,
): ActivityZoneReader {
  return {
    async fetchZoneTimes(id) {
      return zoneTimes(await readActivity(id));
    },
  };
}

export function zoneTimes(raw: unknown): ZoneTimes | null {
  if (!isRecord(raw)) {
    return null;
  }

  const first = seconds(raw, zoneFields[0]);
  const second = seconds(raw, zoneFields[1]);
  const third = seconds(raw, zoneFields[2]);
  const fourth = seconds(raw, zoneFields[3]);
  const fifth = seconds(raw, zoneFields[4]);
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    fifth === undefined
  ) {
    return null;
  }

  return [first, second, third, fourth, fifth];
}

function seconds(raw: Record<string, unknown>, field: (typeof zoneFields)[number]): number | undefined {
  const value = raw[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
