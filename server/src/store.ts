import { Client } from "pg";
import type { ZoneTimes } from "./dominant-zone.js";
import {
  districts,
  recordFromCounts,
  type District,
  type DistrictRecord,
  type ZoneShares,
} from "./district-record.js";
import type { DistrictPlace } from "./place.js";

export type StoredSession = {
  id: string;
  name: string;
  localStart: string;
  durationSeconds: number;
  distanceMeters: number;
  place: DistrictPlace;
  zones: ZoneTimes | null;
};

export type Tally = {
  count: number;
  totalSeconds: number;
  zoneCounts: ZoneShares;
  countedIds: string[];
};

export type CityMemory = {
  sessions: readonly StoredSession[];
  tallies: Partial<Record<District, Tally>>;
};

export type CityStore = {
  remember(memory: CityMemory): Promise<void>;
  cache(): Promise<StoredSession[]>;
  record(district: District): Promise<DistrictRecord>;
  tally(district: District): Promise<Tally | undefined>;
  close(): Promise<void>;
};

const places = ["pool", "open-water", "indoor", "road", "run", "strength"] as const;

export async function createCityStore(databaseUrl: string, schema: string): Promise<CityStore> {
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) {
    throw new Error(`Schema name ${schema} is not usable`);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.session (
      id text PRIMARY KEY,
      name text NOT NULL,
      local_start text NOT NULL,
      duration_seconds double precision NOT NULL,
      distance_meters double precision NOT NULL,
      place text NOT NULL,
      zones jsonb
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.tally (
      district text PRIMARY KEY,
      session_count integer NOT NULL,
      total_seconds double precision NOT NULL,
      zone_1 integer NOT NULL,
      zone_2 integer NOT NULL,
      zone_3 integer NOT NULL,
      zone_4 integer NOT NULL,
      zone_5 integer NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.counted (
      district text NOT NULL,
      garmin_id text NOT NULL,
      PRIMARY KEY (district, garmin_id)
    )
  `);

  return {
    async remember(memory) {
      await client.query("BEGIN");
      try {
        await client.query(`DELETE FROM ${schema}.session`);
        for (const session of memory.sessions) {
          await client.query(
            `INSERT INTO ${schema}.session
              (id, name, local_start, duration_seconds, distance_meters, place, zones)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
            [
              session.id,
              session.name,
              session.localStart,
              session.durationSeconds,
              session.distanceMeters,
              session.place,
              session.zones === null ? null : JSON.stringify(session.zones),
            ],
          );
        }
        for (const district of districts) {
          const tally = memory.tallies[district];
          if (tally === undefined) {
            continue;
          }
          await client.query(`DELETE FROM ${schema}.tally WHERE district = $1`, [district]);
          await client.query(`DELETE FROM ${schema}.counted WHERE district = $1`, [district]);
          await client.query(
            `INSERT INTO ${schema}.tally
              (district, session_count, total_seconds, zone_1, zone_2, zone_3, zone_4, zone_5)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              district,
              tally.count,
              tally.totalSeconds,
              tally.zoneCounts[1],
              tally.zoneCounts[2],
              tally.zoneCounts[3],
              tally.zoneCounts[4],
              tally.zoneCounts[5],
            ],
          );
          for (const id of tally.countedIds) {
            await client.query(
              `INSERT INTO ${schema}.counted (district, garmin_id) VALUES ($1, $2)`,
              [district, id],
            );
          }
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    },
    async cache() {
      const result = await client.query<{
        id: string;
        name: string;
        local_start: string;
        duration_seconds: number;
        distance_meters: number;
        place: string;
        zones: unknown;
      }>(`SELECT id, name, local_start, duration_seconds, distance_meters, place, zones
          FROM ${schema}.session
          ORDER BY local_start, id`);
      return result.rows.map(storedSession);
    },
    async record(district) {
      const tally = await readTally(client, schema, district);
      if (tally === undefined) {
        return recordFromCounts(0, 0, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      }
      return recordFromCounts(tally.count, tally.totalSeconds, tally.zoneCounts);
    },
    async tally(district) {
      return readTally(client, schema, district);
    },
    async close() {
      await client.end();
    },
  };
}

async function readTally(client: Client, schema: string, district: District): Promise<Tally | undefined> {
  const row = await client.query<{
    session_count: number;
    total_seconds: number;
    zone_1: number;
    zone_2: number;
    zone_3: number;
    zone_4: number;
    zone_5: number;
  }>(
    `SELECT session_count, total_seconds, zone_1, zone_2, zone_3, zone_4, zone_5
     FROM ${schema}.tally WHERE district = $1`,
    [district],
  );
  const tally = row.rows[0];
  if (tally === undefined) {
    return undefined;
  }
  const counted = await client.query<{ garmin_id: string }>(
    `SELECT garmin_id FROM ${schema}.counted WHERE district = $1 ORDER BY garmin_id`,
    [district],
  );
  return {
    count: tally.session_count,
    totalSeconds: tally.total_seconds,
    zoneCounts: {
      1: tally.zone_1,
      2: tally.zone_2,
      3: tally.zone_3,
      4: tally.zone_4,
      5: tally.zone_5,
    },
    countedIds: counted.rows.map((countedRow) => countedRow.garmin_id),
  };
}

function storedSession(row: {
  id: string;
  name: string;
  local_start: string;
  duration_seconds: number;
  distance_meters: number;
  place: string;
  zones: unknown;
}): StoredSession {
  if (!isPlace(row.place)) {
    throw new Error(`Stored place ${row.place} is not a district place`);
  }
  return {
    id: row.id,
    name: row.name,
    localStart: row.local_start,
    durationSeconds: row.duration_seconds,
    distanceMeters: row.distance_meters,
    place: row.place,
    zones: zoneTimes(row.zones),
  };
}

function isPlace(value: string): value is DistrictPlace {
  return places.some((place) => place === value);
}

function zoneTimes(value: unknown): ZoneTimes | null {
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value) || value.length !== 5) {
    throw new Error("Stored zone times are unreadable");
  }
  const seconds = value.map((entry) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      throw new Error("Stored zone times are unreadable");
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
    throw new Error("Stored zone times are unreadable");
  }
  return [first, second, third, fourth, fifth];
}
