export type Sport =
  | "pool"
  | "open-water"
  | "indoor"
  | "road"
  | "run"
  | "strength"
  | "gravel"
  | "mountain-bike"
  | "cyclocross"
  | "yoga"
  | "cardio"
  | "hiit"
  | "multisport";

export type Activity = {
  id: string;
  name: string;
  localStart: string;
  durationSeconds: number;
  distanceMeters: number;
  sport: Sport;
};

export type ActivityRange = {
  since: string;
  until: string;
};

export type DataFetcher = {
  fetchActivities(range: ActivityRange): Promise<Activity[]>;
};

export class UnrecognizedSportError extends Error {
  readonly label: string;

  constructor(label: string) {
    super(`Unrecognized sport: ${label}`);
    this.name = "UnrecognizedSportError";
    this.label = label;
  }
}
