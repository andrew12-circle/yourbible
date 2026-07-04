/**
 * Fail the production build early when Supabase client env vars are missing.
 * Vite inlines import.meta.env.VITE_* at build time from process.env.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

// Local builds: Vite would load these; preload so this script sees them too.
loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.production");

const hasUrl = Boolean(process.env.VITE_SUPABASE_URL?.trim());
const hasKey = Boolean(
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim(),
);

const missing = [
  !hasUrl && ["VITE_SUPABASE_URL", "https://YOUR_PROJECT_REF.supabase.co"],
  !hasKey && ["VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_… or VITE_SUPABASE_ANON_KEY"],
].filter(Boolean);

if (missing.length > 0) {
  const lines = missing
    .map(([name, example]) => `  • ${name} (e.g. ${example})`)
    .join("\n");
  const message =
    "\n[build] Missing required environment variables:\n" +
    lines +
    "\n\nSet them in Vercel → Project → Settings → Environment Variables (Production),\n" +
    "then redeploy. For local dev, copy .env.example to .env.\n";

  if (process.env.VERCEL_ENV === "preview") {
    console.warn(
      message +
        "\nContinuing preview build; the app will render its runtime configuration error screen.\n",
    );
    process.exit(0);
  }

  console.error(message);
  process.exit(1);
}
