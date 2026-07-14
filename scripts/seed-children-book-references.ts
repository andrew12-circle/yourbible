/**
 * Upload approved character/studio reference model sheets into the Supabase
 * `children-book-references` bucket so the edge function can attach them to every
 * generation request.
 *
 * Usage:
 *   npx tsx scripts/seed-children-book-references.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY) in
 * .env. Paths mirror their location under public/ so the edge allow-list matches.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  CHARACTER_REFERENCE_ASSETS,
  STUDIO_STYLE_ANCHOR,
} from "../src/lib/children-books/characterReferenceAssets.ts";

const BUCKET = "children-book-references";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function loadEnv(): Promise<Record<string, string>> {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return {};
  const raw = await readFile(envPath, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function contentTypeFor(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

function collectReferencePaths(): string[] {
  const paths = new Set<string>([STUDIO_STYLE_ANCHOR.path]);
  for (const asset of Object.values(CHARACTER_REFERENCE_ASSETS)) {
    for (const p of asset.referenceImagePaths) paths.add(p);
  }
  return [...paths];
}

async function main() {
  const env = { ...process.env, ...(await loadEnv()) } as Record<string, string>;
  const url = env.SUPABASE_URL?.trim();
  const serviceRole = (env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY)?.trim();
  if (!url || !serviceRole) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env");
  }

  const admin = createClient(url, serviceRole);
  const paths = collectReferencePaths();
  let uploaded = 0;
  let failures = 0;

  for (const rel of paths) {
    const filePath = path.join(root, "public", rel);
    if (!existsSync(filePath)) {
      console.error(`  MISSING approved asset: public/${rel}`);
      failures += 1;
      continue;
    }
    const bytes = await readFile(filePath);
    const { error } = await admin.storage.from(BUCKET).upload(rel, bytes, {
      upsert: true,
      contentType: contentTypeFor(rel),
      cacheControl: "31536000",
    });
    if (error) {
      console.error(`  FAILED ${rel}: ${error.message}`);
      failures += 1;
    } else {
      console.log(`  uploaded ${rel}`);
      uploaded += 1;
    }
  }

  console.log(`\nSeed complete: ${uploaded} uploaded, ${failures} failure(s).`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
