import {
  FileTokenStorage,
  GarminConnectSDK,
  GarminMfaRequiredError,
} from "garmin-connect-sdk";
import type { ActivityRange, DataFetcher } from "../activity.js";
import type { DistrictRecordSource } from "../district-record.js";
import { zoneTimes } from "./zone-times.js";
import { createGarminDataFetcher, zonedActivity } from "./garmin-data-fetcher.js";

export function createLiveGarminDataFetcher(env: NodeJS.ProcessEnv = process.env): DataFetcher {
  return createGarminDataFetcher(connectLister(env));
}

const historyPageSize = 100;
const historyPageCap = 100;

export function createLiveDistrictRecordSource(
  env: NodeJS.ProcessEnv = process.env,
): DistrictRecordSource {
  return {
    async fetchHistory() {
      const garmin = await signedInClient(env);
      const listed = await everyActivity(garmin);
      return listed.map((item) => zonedActivity(item));
    },
    async fetchZoneTimes(id) {
      const garmin = await signedInClient(env);
      const listed = await findActivity(garmin, id);
      return listed === undefined ? null : zoneTimes(listed);
    },
  };
}

async function everyActivity(garmin: GarminConnectSDK): Promise<unknown[]> {
  const activities: unknown[] = [];
  for (let page = 0; page < historyPageCap; page += 1) {
    const batch = await garmin.activities.list({
      start: page * historyPageSize,
      limit: historyPageSize,
      sortOrder: "desc",
    });
    activities.push(...batch);
    if (batch.length < historyPageSize) {
      return activities;
    }
  }
  return activities;
}

async function findActivity(garmin: GarminConnectSDK, id: string): Promise<unknown | undefined> {
  for (let page = 0; page < historyPageCap; page += 1) {
    const batch = await garmin.activities.list({
      start: page * historyPageSize,
      limit: historyPageSize,
      sortOrder: "desc",
    });
    const found = batch.find((item) => listedId(item) === id);
    if (found !== undefined) {
      return found;
    }
    if (batch.length < historyPageSize) {
      return undefined;
    }
  }
  return undefined;
}

function listedId(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  if (!("activityId" in raw)) {
    return undefined;
  }
  const value = raw.activityId;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}

function connectLister(env: NodeJS.ProcessEnv) {
  return async (range: ActivityRange): Promise<unknown[]> => {
    const garmin = await signedInClient(env);
    return garmin.activities.listAll({
      startDate: range.since,
      endDate: range.until,
      sortOrder: "desc",
    });
  };
}

async function signedInClient(env: NodeJS.ProcessEnv): Promise<GarminConnectSDK> {
  const garmin = new GarminConnectSDK({
    storage: new FileTokenStorage(env["GARMIN_TOKEN_PATH"] ?? ".garmin-tokens"),
  });

  if (await garmin.restoreSession()) {
    return garmin;
  }

  const email = present(env["GARMIN_EMAIL"]);
  const password = present(env["GARMIN_PASSWORD"]);
  if (email === undefined || password === undefined) {
    throw new Error("Set GARMIN_EMAIL and GARMIN_PASSWORD, or save a token in .garmin-tokens.");
  }

  const mfaCode = present(env["GARMIN_MFA_CODE"]);
  try {
    await garmin.login(mfaCode === undefined ? { email, password } : { email, password, mfaCode });
  } catch (error) {
    if (error instanceof GarminMfaRequiredError) {
      throw new Error("Garmin asked for a code. Set GARMIN_MFA_CODE and run again.");
    }
    throw error;
  }

  return garmin;
}

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}
