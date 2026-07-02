/**
 * Resolve the real Wikimedia Commons filename for every Doré scene.
 *
 * The 2010 "Doré's English Bible" upload set uses `NNN.Title_Words.jpg`, but the
 * plate numbers in our scene index do not always match Commons, and a few titles
 * differ. This scans Commons (search + prefix APIs), verifies each candidate URL
 * resolves to a real image, and writes a scene -> filename map.
 *
 * Usage: node scripts/discover-dore-files.mjs
 * Output: scripts/data/dore-files-discovered.json
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import scenes from "./data/doreScenes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data", "dore-files-discovered.json");
const API = "https://commons.wikimedia.org/w/api.php";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugTitle(title) {
  return title.replace(/\s+/g, "_").replace(/_+/g, "_");
}

function guessFilename(scene) {
  if (scene.file) return scene.file;
  return `${String(scene.n).padStart(3, "0")}.${slugTitle(scene.t)}.jpg`;
}

function filePathUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=960`;
}

/** HEAD the FilePath URL, following redirects; retry on 429 rate limiting. */
async function urlResolves(filename, attempt = 0) {
  try {
    const res = await fetch(filePathUrl(filename), {
      method: "HEAD",
      redirect: "follow",
    });
    if (res.status === 429 && attempt < 5) {
      await sleep(1500 * (attempt + 1));
      return urlResolves(filename, attempt + 1);
    }
    return res.status === 200;
  } catch {
    if (attempt < 3) {
      await sleep(1000 * (attempt + 1));
      return urlResolves(filename, attempt + 1);
    }
    return false;
  }
}

async function apiJson(params, attempt = 0) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  try {
    const res = await fetch(u);
    if (res.status === 429 && attempt < 5) {
      await sleep(1500 * (attempt + 1));
      return apiJson(params, attempt + 1);
    }
    return await res.json();
  } catch {
    if (attempt < 3) {
      await sleep(1000 * (attempt + 1));
      return apiJson(params, attempt + 1);
    }
    return {};
  }
}

/** True when a Commons filename looks like a Doré English Bible plate. */
function isDorePlateName(name) {
  return /^\d{3}\..+\.jpe?g$/i.test(name);
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Find the Doré plate filename by full-text searching the title on Commons. */
async function searchByTitle(scene) {
  const j = await apiJson({
    action: "query",
    list: "search",
    srsearch: `intitle:"${scene.t}"`,
    srnamespace: "6",
    srlimit: "30",
  });
  const hits = (j.query?.search ?? []).map((x) => x.title.replace(/^File:/, ""));
  const wantTitle = normalize(scene.t);
  const platePrefix = String(scene.n).padStart(3, "0");

  const candidates = hits.filter(isDorePlateName);
  const withTitle = candidates.filter((name) => {
    const body = normalize(name.replace(/^\d{3}\./, "").replace(/\.jpe?g$/i, ""));
    return body.includes(wantTitle) || wantTitle.includes(body);
  });

  return (
    withTitle.find((name) => name.startsWith(`${platePrefix}.`)) ??
    withTitle[0] ??
    null
  );
}

async function resolveScene(scene) {
  const guess = guessFilename(scene);
  if (await urlResolves(guess)) {
    return { filename: guess, method: "guess" };
  }
  await sleep(200);
  const searched = await searchByTitle(scene);
  if (searched && (await urlResolves(searched))) {
    return { filename: searched, method: "search" };
  }
  return { filename: null, method: "unresolved" };
}

const results = [];
let resolved = 0;
for (const scene of scenes) {
  const { filename, method } = await resolveScene(scene);
  if (filename) resolved += 1;
  results.push({
    n: scene.n,
    b: scene.b,
    c: scene.c,
    v: scene.v,
    r: scene.r,
    t: scene.t,
    filename,
    method,
  });
  const tag = filename ? method : "UNRESOLVED";
  console.log(`${String(scene.n).padStart(3, "0")} [${tag}] ${filename ?? scene.t}`);
  await sleep(300);
}

writeFileSync(OUT, JSON.stringify(results, null, 2), "utf8");
console.log(`\nResolved ${resolved}/${scenes.length} → ${OUT}`);
const missing = results.filter((r) => !r.filename);
if (missing.length) {
  console.log("Unresolved scenes:");
  for (const m of missing) console.log(`  ${m.n} ${m.t} (${m.r})`);
}
