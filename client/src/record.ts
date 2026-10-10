import type { CityPlace, PlaceSize, Session } from "./city.js";

export const districts = ["swim", "bike", "run", "strength"] as const;

export type District = (typeof districts)[number];

export type RecordView = {
  district: District;
  sessions: Session[];
  place?: CityPlace;
};

const districtNames = {
  swim: "Swim",
  bike: "Bike",
  run: "Run",
  strength: "Strength",
} as const satisfies Record<District, string>;

const districtOf = {
  pool: "swim",
  "open-water": "swim",
  indoor: "bike",
  road: "bike",
  run: "run",
  strength: "strength",
} as const satisfies Record<CityPlace, District>;

const placesIn = {
  swim: ["pool", "open-water"],
  bike: ["indoor", "road"],
  run: ["run"],
  strength: ["strength"],
} as const satisfies Record<District, readonly CityPlace[]>;

export function districtName(district: District): string {
  return districtNames[district];
}

export type EffortZone = 1 | 2 | 3 | 4 | 5;

export type RecordHeader = {
  count: number;
  totalSeconds: number;
  averageSeconds: number;
  headline: { zone: EffortZone; share: number } | null;
};

const counted = {
  swim: { one: "swim", many: "swims", total: "Total swimming time" },
  bike: { one: "ride", many: "rides", total: "Total riding time" },
  run: { one: "run", many: "runs", total: "Total running time" },
  strength: { one: "strength session", many: "strength sessions", total: "Total strength time" },
} as const satisfies Record<District, { one: string; many: string; total: string }>;

export function describeRecord(district: District, header: RecordHeader): string[] {
  const word = header.count === 1 ? counted[district].one : counted[district].many;
  const lines = [
    `${header.count} ${word} ever recorded.`,
    `${counted[district].total} of ${formatDuration(header.totalSeconds)}.`,
    `Average session ${formatDuration(header.averageSeconds)}.`,
  ];
  if (header.headline !== null) {
    const percent = Math.round(header.headline.share * 100);
    lines.push(
      `${percent}% of ${counted[district].many} with a zone were performed in Z${header.headline.zone}.`,
    );
  }
  return lines;
}

export function describeZones(
  zones: readonly [number, number, number, number, number] | null,
): string {
  if (zones === null) {
    return "No heart-rate zones.";
  }
  return zones.map((seconds, index) => `Z${index + 1} ${seconds} s`).join(" · ");
}

export function parseRecord(value: unknown): RecordHeader {
  if (!isRecord(value)) {
    throw new Error("District record is unreadable");
  }
  const count = value["count"];
  const totalSeconds = value["totalSeconds"];
  const averageSeconds = value["averageSeconds"];
  if (!isFiniteNumber(count) || !isFiniteNumber(totalSeconds) || !isFiniteNumber(averageSeconds)) {
    throw new Error("District record is unreadable");
  }
  return {
    count,
    totalSeconds,
    averageSeconds,
    headline: parseHeadline(value["headline"]),
  };
}

export function parseZones(value: unknown): readonly [number, number, number, number, number] | null {
  if (!isRecord(value)) {
    throw new Error("Session zones are unreadable");
  }
  const zones = value["zones"];
  if (zones === null) {
    return null;
  }
  if (!Array.isArray(zones) || zones.length !== 5) {
    throw new Error("Session zones are unreadable");
  }
  const seconds = zones.map((entry) => {
    if (!isFiniteNumber(entry)) {
      throw new Error("Session zones are unreadable");
    }
    return entry;
  });
  const first = seconds[0];
  const second = seconds[1];
  const third = seconds[2];
  const fourth = seconds[3];
  const fifth = seconds[4];
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    fifth === undefined
  ) {
    throw new Error("Session zones are unreadable");
  }
  return [first, second, third, fourth, fifth];
}

function parseHeadline(value: unknown): RecordHeader["headline"] {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error("District record is unreadable");
  }
  const zone = value["zone"];
  const share = value["share"];
  if (!isEffortZone(zone) || !isFiniteNumber(share)) {
    throw new Error("District record is unreadable");
  }
  return { zone, share };
}

function isEffortZone(value: unknown): value is EffortZone {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  if (rest === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${rest} min`;
}

export function chooseRecord(places: readonly PlaceSize[], choice: CityPlace | District): RecordView {
  const district = isDistrict(choice) ? choice : districtOf[choice];
  const included = isDistrict(choice) ? placesIn[district] : [choice];
  const sessions = places
    .filter((entry) => included.some((place) => place === entry.place))
    .flatMap((entry) => entry.sessions)
    .sort((left, right) => right.localStart.localeCompare(left.localStart));

  if (isDistrict(choice)) {
    return { district, sessions };
  }
  return { district, place: choice, sessions };
}

function isDistrict(choice: CityPlace | District): choice is District {
  return districts.some((district) => district === choice);
}
