import { createServer, type Server, type ServerResponse } from "node:http";
import type { Activity, DataFetcher } from "./activity.js";
import {
  districtRecord,
  inDistrict,
  isDistrict,
  type District,
  type DistrictRecordSource,
} from "./district-record.js";
import { place, type DistrictPlace } from "./place.js";
import { cityWindow, sizeCity } from "./size-city.js";
import { syncCity } from "./sync-city.js";
import type { CityStore, StoredSession } from "./store.js";

export function createStoredCityServer(
  source: DistrictRecordSource,
  store: CityStore,
  until: string,
): Server {
  return createServer((request, response) => {
    const path = requestPath(request.url);
    if (request.method !== "GET" || path === undefined) {
      response.writeHead(404);
      response.end();
      return;
    }

    if (path === "/city") {
      void respondStoredCity(source, store, until, response);
      return;
    }

    const district = districtRoute(path);
    if (district !== undefined) {
      void respondStoredDistrict(source, store, until, district, response);
      return;
    }

    const sessionId = sessionRoute(path);
    if (sessionId !== undefined) {
      void respondStoredZones(source, store, until, sessionId, response);
      return;
    }

    response.writeHead(404);
    response.end();
  });
}

async function respondStoredCity(
  source: DistrictRecordSource,
  store: CityStore,
  until: string,
  response: ServerResponse,
): Promise<void> {
  try {
    await syncCity(source, store, until);
    const activities = (await store.cache()).map(storedActivity);
    const places = cityPlaces(activities, until);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ places }));
  } catch (error) {
    fail(response, error, "City request failed");
  }
}

async function respondStoredDistrict(
  source: DistrictRecordSource,
  store: CityStore,
  until: string,
  district: District,
  response: ServerResponse,
): Promise<void> {
  try {
    await syncCity(source, store, until);
    const record = await store.record(district);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(record));
  } catch (error) {
    fail(response, error, "District record failed");
  }
}

async function respondStoredZones(
  source: DistrictRecordSource,
  store: CityStore,
  until: string,
  id: string,
  response: ServerResponse,
): Promise<void> {
  try {
    await syncCity(source, store, until);
    const cached = (await store.cache()).find((session) => session.id === id);
    const zones = cached !== undefined ? cached.zones : await source.fetchZoneTimes(id);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ zones }));
  } catch (error) {
    fail(response, error, "Session zones failed");
  }
}

function storedActivity(session: StoredSession): Activity {
  return {
    id: session.id,
    name: session.name,
    localStart: session.localStart,
    durationSeconds: session.durationSeconds,
    distanceMeters: session.distanceMeters,
    sport: session.place,
  };
}

function fail(response: ServerResponse, error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : fallback;
  response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
  response.end(message);
}

export function createCityServer(
  fetcher: DataFetcher,
  until: string,
  records?: DistrictRecordSource,
): Server {
  return createServer((request, response) => {
    const path = requestPath(request.url);
    if (request.method !== "GET" || path === undefined) {
      response.writeHead(404);
      response.end();
      return;
    }

    if (path === "/city") {
      void respond(fetcher, until, response);
      return;
    }

    const district = districtRoute(path);
    if (district !== undefined && records !== undefined) {
      void respondDistrict(records, district, response);
      return;
    }

    const sessionId = sessionRoute(path);
    if (sessionId !== undefined && records !== undefined) {
      void respondZones(records, sessionId, response);
      return;
    }

    response.writeHead(404);
    response.end();
  });
}

function requestPath(url: string | undefined): string | undefined {
  if (url === undefined) {
    return undefined;
  }
  return new URL(url, "http://127.0.0.1").pathname;
}

function sessionRoute(path: string): string | undefined {
  const match = /^\/sessions\/([^/]+)\/zones$/.exec(path);
  const id = match?.[1];
  if (id === undefined || id.length === 0) {
    return undefined;
  }
  return decodeURIComponent(id);
}

function districtRoute(path: string): District | undefined {
  const match = /^\/districts\/([^/]+)$/.exec(path);
  const name = match?.[1];
  if (name !== undefined && isDistrict(name)) {
    return name;
  }
  return undefined;
}

async function respondDistrict(
  records: DistrictRecordSource,
  district: District,
  response: ServerResponse,
): Promise<void> {
  try {
    const history = await records.fetchHistory();
    const sessions = history.filter((activity) => inDistrict(activity, district));
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(districtRecord(sessions)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "District record failed";
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(message);
  }
}

async function respondZones(
  records: DistrictRecordSource,
  id: string,
  response: ServerResponse,
): Promise<void> {
  try {
    const zones = await records.fetchZoneTimes(id);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ zones }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session zones failed";
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(message);
  }
}

async function respond(
  fetcher: DataFetcher,
  until: string,
  response: ServerResponse,
): Promise<void> {
  try {
    const activities = await fetcher.fetchActivities(cityWindow(until));
    const places = cityPlaces(activities, until);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ places }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "City request failed";
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(message);
  }
}

type CitySession = {
  id: string;
  name: string;
  localStart: string;
  durationSeconds: number;
  distanceMeters: number;
};

function cityPlaces(activities: readonly Activity[], until: string) {
  const { since } = cityWindow(until);
  const sessions: Record<DistrictPlace, CitySession[]> = {
    pool: [],
    "open-water": [],
    indoor: [],
    road: [],
    run: [],
    strength: [],
  };

  for (const activity of activities) {
    const date = activity.localStart.slice(0, 10);
    if (date < since || date > until) {
      continue;
    }
    const placement = place(activity);
    if (placement.outcome !== "placed") {
      continue;
    }
    sessions[placement.place].push({
      id: activity.id,
      name: activity.name,
      localStart: activity.localStart,
      durationSeconds: activity.durationSeconds,
      distanceMeters: activity.distanceMeters,
    });
  }

  for (const list of Object.values(sessions)) {
    list.sort((left, right) => right.localStart.localeCompare(left.localStart));
  }

  return sizeCity(activities, until).map((size) => ({
    place: size.place,
    size: size.size,
    sessions: sessions[size.place],
  }));
}
