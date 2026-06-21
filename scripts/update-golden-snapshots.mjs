/**
 * Regenerate golden chapter snapshot JSON from committed HTML fixtures.
 * Usage: node scripts/update-golden-snapshots.mjs
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.UPDATE_GOLDEN = "1";
execSync("npx vitest run src/lib/bible/goldenChapters.test.ts", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
