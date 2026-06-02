import { existsSync, readFileSync } from "node:fs";

function loadEnv(filename) {
  if (!existsSync(filename)) return;
  for (const line of readFileSync(filename, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const url = process.env.VITE_SUPABASE_URL?.trim();
const key = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)?.trim();

if (!url || !key) {
  console.error("Missing Supabase env in .env");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/artifacts?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log("artifacts REST:", res.status, res.statusText);
console.log((await res.text()).slice(0, 300));
