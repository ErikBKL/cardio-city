import { reportActivities } from "./report.js";
import { createLiveGarminDataFetcher } from "./garmin/connect-lister.js";
import { loadLocalEnv } from "./load-local-env.js";

loadLocalEnv();

const since = process.argv[2] ?? daysAgo(41);
const until = process.argv[3] ?? daysAgo(0);
const report = await reportActivities(createLiveGarminDataFetcher(), { since, until });
console.log(report);

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
