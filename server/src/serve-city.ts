import { once } from "node:events";
import { createStoredCityServer } from "./city-server.js";
import { createLiveDistrictRecordSource } from "./garmin/connect-lister.js";
import { loadLocalEnv } from "./load-local-env.js";
import { createCityStore } from "./store.js";

loadLocalEnv();

const port = Number(process.env["CITY_PORT"] ?? 3001);
const databaseUrl =
  process.env["DATABASE_URL"] ?? "postgres://cardio:cardio@127.0.0.1:54329/cardio_city";
const store = await createCityStore(databaseUrl, "city");
const server = createStoredCityServer(createLiveDistrictRecordSource(), store, localToday());
server.listen(port, "127.0.0.1");
await once(server, "listening");
console.log(`City server at http://127.0.0.1:${port}/city`);

function localToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
