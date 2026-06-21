#!/usr/bin/env node
/**
 * Production readiness checks for invite-only beta.
 * Usage:
 *   node scripts/verify-prod.mjs
 *   PRODUCTION_URL=https://your-domain.com node scripts/verify-prod.mjs
 *
 * Optional env: SUPABASE_ACCESS_TOKEN, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = "itmcsyrnpcnrwviigppe";

function loadDotEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = { ...loadDotEnv(), ...process.env };
const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim();
const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();
const productionUrl = env.PRODUCTION_URL?.trim().replace(/\/$/, "");

const results = [];
let failed = 0;

function pass(label, detail) {
  results.push({ ok: true, label, detail });
  console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail) {
  results.push({ ok: false, label, detail });
  failed += 1;
  console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function warn(label, detail) {
  results.push({ ok: true, label, detail, warn: true });
  console.warn(`! ${label}${detail ? ` — ${detail}` : ""}`);
}

// --- Repo checks ---
const migrationsDir = join(root, "supabase", "migrations");
const migrationCount = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).length;
pass("Local migrations", `${migrationCount} SQL files`);

const functionsDir = join(root, "supabase", "functions");
const functionCount = readdirSync(functionsDir).filter(
  (f) => !f.startsWith("_") && !f.startsWith(".") && existsSync(join(functionsDir, f, "index.ts")),
).length;
pass("Local edge functions", `${functionCount} function folders`);

const requiredSecrets = ["GEMINI_API_KEY", "API_BIBLE_KEY"];
const optionalSecrets = ["ELEVENLABS_API_KEY", "OPENAI_API_KEY", "ASSEMBLYAI_API_KEY"];

async function listSupabaseSecrets() {
  if (!accessToken) {
    warn("Supabase secrets", "Set SUPABASE_ACCESS_TOKEN to verify deployed secrets");
    return;
  }
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    fail("Supabase secrets API", `${r.status} ${await r.text()}`);
    return;
  }
  const rows = await r.json();
  const names = new Set(rows.map((s) => s.name));
  for (const name of requiredSecrets) {
    if (names.has(name)) pass(`Secret ${name}`, "set");
    else fail(`Secret ${name}`, "missing on Supabase project");
  }
  for (const name of optionalSecrets) {
    if (names.has(name)) pass(`Secret ${name}`, "set");
    else warn(`Secret ${name}`, "not set (some features disabled)");
  }
}

async function smokeBiblePassage() {
  if (!supabaseUrl || !anonKey) {
    warn("bible-passage smoke", "Set VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in .env");
    return;
  }
  const u = new URL(`${supabaseUrl}/functions/v1/bible-passage`);
  u.searchParams.set("action", "bibles");
  u.searchParams.set("language", "eng");
  const r = await fetch(u, {
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  });
  if (!r.ok) {
    fail("bible-passage smoke", `${r.status}`);
    return;
  }
  const json = await r.json();
  const count = Array.isArray(json?.data) ? json.data.length : 0;
  pass("bible-passage smoke", `${count} bibles returned`);
}

async function smokeProductionFrontend() {
  if (!productionUrl) {
    warn("Production frontend", "Set PRODUCTION_URL to smoke-test live SPA");
    return;
  }
  const r = await fetch(productionUrl, { redirect: "follow" });
  if (!r.ok) {
    fail("Production frontend", `${productionUrl} returned ${r.status}`);
    return;
  }
  const html = await r.text();
  if (html.includes("Belief Architecture")) pass("Production frontend", productionUrl);
  else warn("Production frontend", `${productionUrl} loaded but title branding not found in HTML`);
}

async function checkVerseAiRequiresAuth() {
  if (!supabaseUrl || !anonKey) return;
  const r = await fetch(`${supabaseUrl}/functions/v1/verse-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ mode: "summary", reference: "John 3:16", verseText: "For God so loved the world." }),
  });
  if (r.status === 401) pass("verse-ai auth guard", "anon key rejected");
  else warn("verse-ai auth guard", `expected 401 with anon key, got ${r.status} — redeploy verse-ai after securing`);
}

async function checkSleepTtsRequiresAuth() {
  if (!supabaseUrl || !anonKey) return;
  const r = await fetch(`${supabaseUrl}/functions/v1/sleep-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ text: "test" }),
  });
  if (r.status === 401) pass("sleep-tts auth guard", "anon key rejected");
  else warn("sleep-tts auth guard", `expected 401 with anon key, got ${r.status} — redeploy sleep-tts after securing`);
}

console.log("\nBelief Architecture — production verification\n");

await listSupabaseSecrets();
await smokeBiblePassage();
await smokeProductionFrontend();
await checkVerseAiRequiresAuth();
await checkSleepTtsRequiresAuth();

console.log("\n--- Manual checklist (dashboard) ---");
console.log("• Supabase Auth → URL config: Site URL + redirect allowlist include production domain");
console.log("• Lovable OAuth: production origin allowlisted for Google/Apple");
console.log("• Vercel env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SENTRY_DSN");
console.log("• Run: npx supabase db push --project-ref", projectRef);
console.log("• Deploy secured functions: verse-ai, sleep-tts, framework-embed-transcript");
console.log("");

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.\n`);
  process.exit(1);
}
console.log("\nAll automated checks passed (review warnings above).\n");
