/**
 * Resolve every Doré scene's Commons file to a direct upload.wikimedia.org
 * thumbnail URL (width 960) via a single batched imageinfo query per 50 files.
 *
 * Direct CDN thumbnails avoid the Special:FilePath redirect (faster for users)
 * and let scripts/validate-bible-plates.mjs confirm existence cheaply.
 *
 * Usage: node scripts/resolve-commons-thumbs.mjs
 * Output: scripts/data/commons-thumbs.json  ({ "<filename>": "<thumburl>" })
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import scenes from "./data/doreScenes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data", "commons-thumbs.json");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "yourbible-plate-discovery/1.0 (dev script)";
const WIDTH = 960;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CRUCIFIXION_FILE = "Gustave_Doré_-_Crucifixion_of_Jesus.jpg";
const filenames = new Set([CRUCIFIXION_FILE]);
for (const s of scenes) if (s.file) filenames.add(s.file);

async function apiJson(params, attempt = 0) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (attempt < 6) {
      await sleep(3000 * (attempt + 1));
      return apiJson(params, attempt + 1);
    }
    throw new Error(`API returned non-JSON: ${text.slice(0, 80)}`);
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const all = [...filenames];
const map = {};
const missing = [];

for (const batch of chunk(all, 50)) {
  const titles = batch.map((f) => `File:${f}`).join("|");
  const j = await apiJson({
    action: "query",
    titles,
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(WIDTH),
  });
  const pages = Object.values(j.query?.pages ?? {});
  // Map normalized title back to our filename.
  const norm = new Map();
  for (const f of batch) norm.set(`File:${f}`.replace(/_/g, " "), f);
  for (const p of pages) {
    const thumb = p.imageinfo?.[0]?.thumburl;
    const key = norm.get(p.title.replace(/_/g, " ")) ?? p.title.replace(/^File:/, "");
    if (thumb) map[key] = thumb;
    else missing.push(key);
  }
  await sleep(1200);
}

writeFileSync(OUT, JSON.stringify(map, null, 2), "utf8");
console.log(`Resolved ${Object.keys(map).length}/${all.length} thumbnails → ${OUT}`);
if (missing.length) {
  console.log("Missing thumbnails:");
  for (const m of missing) console.log(`  ${m}`);
}
