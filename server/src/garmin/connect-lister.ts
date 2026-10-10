import {
  FileTokenStorage,
  GarminConnectSDK,
  GarminMfaRequiredError,
} from "garmin-connect-sdk";
import type { ActivityRange, DataFetcher } from "../activity.js";
import { createGarminDataFetcher } from "./garmin-data-fetcher.js";

export function createLiveGarminDataFetcher(env: NodeJS.ProcessEnv = process.env): DataFetcher {
  return createGarminDataFetcher(connectLister(env));
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
