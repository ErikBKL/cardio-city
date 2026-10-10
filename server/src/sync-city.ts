import { dominantZone } from "./dominant-zone.js";
import {
  districts,
  districtFor,
  type District,
  type DistrictRecordSource,
  type ZonedActivity,
} from "./district-record.js";
import { place } from "./place.js";
import { cityWindow } from "./size-city.js";
import type { CityStore, StoredSession, Tally } from "./store.js";

const recentLimit = 10;

export async function syncCity(
  source: DistrictRecordSource,
  store: CityStore,
  until: string,
): Promise<void> {
  const history = await source.fetchHistory();
  const tallies = await loadTallies(store);
  for (const activity of history) {
    countIfNew(tallies, activity);
  }
  const sessions = cacheSessions(history, await store.cache(), until);
  await store.remember({ sessions, tallies });
}

export async function refreshDistrict(
  source: DistrictRecordSource,
  store: CityStore,
  district: District,
  until: string,
): Promise<void> {
  const history = await source.fetchHistory();
  const tallies = await loadTallies(store);
  tallies[district] = emptyTally();
  for (const activity of history) {
    if (districtFor(activity) !== district) {
      continue;
    }
    countIfNew(tallies, activity);
  }
  const kept = (await store.cache()).filter((session) => districtFor(stored(session)) !== district);
  const sessions = cacheSessions(history, kept, until);
  await store.remember({ sessions, tallies });
}

async function loadTallies(store: CityStore): Promise<Record<District, Tally>> {
  const tallies = {
    swim: emptyTally(),
    bike: emptyTally(),
    run: emptyTally(),
    strength: emptyTally(),
  } satisfies Record<District, Tally>;
  for (const district of districts) {
    const existing = await store.tally(district);
    if (existing !== undefined) {
      tallies[district] = {
        ...existing,
        zoneCounts: { ...existing.zoneCounts },
        countedIds: [...existing.countedIds],
      };
    }
  }
  return tallies;
}

function countIfNew(tallies: Record<District, Tally>, activity: ZonedActivity): void {
  const district = districtFor(activity);
  if (district === undefined) {
    return;
  }
  const tally = tallies[district];
  if (tally.countedIds.includes(activity.id)) {
    return;
  }
  tally.count += 1;
  tally.totalSeconds += activity.durationSeconds;
  if (activity.zones !== null) {
    const zone = dominantZone(activity.zones);
    if (zone !== null) {
      tally.zoneCounts[zone] += 1;
    }
  }
  tally.countedIds.push(activity.id);
}

function cacheSessions(
  history: readonly ZonedActivity[],
  alreadyCached: readonly StoredSession[],
  until: string,
): StoredSession[] {
  const pooled = new Map<string, StoredSession>();
  for (const session of alreadyCached) {
    pooled.set(session.id, session);
  }
  for (const activity of history) {
    const session = storedFrom(activity);
    if (session !== undefined) {
      pooled.set(session.id, session);
    }
  }

  const { since } = cityWindow(until);
  const kept = new Map<string, StoredSession>();
  for (const district of districts) {
    const sessions = [...pooled.values()].filter((session) => districtFor(stored(session)) === district);
    const newest = [...sessions].sort((left, right) =>
      right.localStart.localeCompare(left.localStart),
    );
    for (const session of newest.slice(0, recentLimit)) {
      kept.set(session.id, session);
    }
    for (const session of sessions) {
      const date = session.localStart.slice(0, 10);
      if (date >= since && date <= until) {
        kept.set(session.id, session);
      }
    }
  }
  return [...kept.values()];
}

function storedFrom(activity: ZonedActivity): StoredSession | undefined {
  const placement = place(activity);
  if (placement.outcome !== "placed") {
    return undefined;
  }
  return {
    id: activity.id,
    name: activity.name,
    localStart: activity.localStart,
    durationSeconds: activity.durationSeconds,
    distanceMeters: activity.distanceMeters,
    place: placement.place,
    zones: activity.zones,
  };
}

function stored(session: StoredSession): ZonedActivity {
  return {
    id: session.id,
    name: session.name,
    localStart: session.localStart,
    durationSeconds: session.durationSeconds,
    distanceMeters: session.distanceMeters,
    sport: session.place,
    zones: session.zones,
  };
}

function emptyTally(): Tally {
  return {
    count: 0,
    totalSeconds: 0,
    zoneCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    countedIds: [],
  };
}
