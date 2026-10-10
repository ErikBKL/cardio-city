import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { loadLocalEnv } from "../src/load-local-env.js";

const execFileAsync = promisify(execFile);

loadLocalEnv();

const configured =
  (process.env["GARMIN_EMAIL"]?.trim().length ?? 0) > 0 || existsSync(".garmin-tokens/tokens.json");

test.skipIf(!configured)("a live fetch places the account", async () => {
  const { stdout } = await execFileAsync("npx", ["tsx", "src/print-report.ts"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
  });

  const total = stdout
    .trim()
    .split("\n")
    .reduce((sum, line) => sum + countOf(line), 0);
  expect(total).toBeGreaterThan(0);
});

function countOf(line: string): number {
  const count = Number(line.split(" ").at(-1));
  if (!Number.isInteger(count)) {
    throw new Error(`Unreadable report line: ${line}`);
  }
  return count;
}
