export const cityPlaces = [
  "pool",
  "open-water",
  "indoor",
  "road",
  "run",
  "strength",
] as const;

export type CityPlace = (typeof cityPlaces)[number];

export type Session = {
  id: string;
  name: string;
  localStart: string;
  durationSeconds: number;
  distanceMeters: number;
};

export type PlaceSize = {
  place: CityPlace;
  size: number;
  sessions: Session[];
};

export function parseCity(value: unknown): PlaceSize[] {
  if (!isRecord(value) || !Array.isArray(value["places"])) {
    throw new Error("City payload is missing places");
  }
  return value["places"].map(parsePlaceSize);
}

function parsePlaceSize(value: unknown): PlaceSize {
  if (!isRecord(value)) {
    throw new Error("A place size is not an object");
  }
  const place = value["place"];
  const size = value["size"];
  if (!isCityPlace(place) || typeof size !== "number" || !Number.isFinite(size) || !Array.isArray(value["sessions"])) {
    throw new Error("A place size is unreadable");
  }
  return { place, size, sessions: value["sessions"].map(parseSession) };
}

function parseSession(value: unknown): Session {
  if (!isRecord(value)) {
    throw new Error("A session is not an object");
  }
  const id = value["id"];
  const name = value["name"];
  const localStart = value["localStart"];
  const durationSeconds = value["durationSeconds"];
  const distanceMeters = value["distanceMeters"];
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof name !== "string" ||
    typeof localStart !== "string" ||
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    typeof distanceMeters !== "number" ||
    !Number.isFinite(distanceMeters)
  ) {
    throw new Error("A session is unreadable");
  }
  return { id, name, localStart, durationSeconds, distanceMeters };
}

function isCityPlace(value: unknown): value is CityPlace {
  return typeof value === "string" && cityPlaces.some((place) => place === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
