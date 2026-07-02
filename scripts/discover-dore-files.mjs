/**
 * Resolve the real Wikimedia Commons filename for every Doré scene.
 *
 * Strategy:
 *  - Fetch the authoritative "Doré's English Bible" category (the 2010 numbered
 *    upload set, plates 001-152, OT + Apocrypha) once, and match each OT scene
 *    to it by TITLE (plate numbers drift, titles are stable).
 *  - The New Testament plates are NOT part of that numbered set on Commons, so
 *    they are supplied as a hand-verified curated map (see NT_CURATED below,
 *    each confirmed via scripts/verify-nt-candidates.mjs to be a genuine Doré
 *    Bible engraving in an "...by Gustave Doré" category).
 *
 * Any scene that cannot be matched to a verified file is reported as UNRESOLVED
 * and is dropped from the generated plates (better no plate than a broken one).
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
const UA = "yourbible-plate-discovery/1.0 (dev script)";
const CATEGORY = "Category:Doré's English Bible";

/**
 * Hand-verified New Testament Doré engravings (title -> Commons filename).
 * Confirmed genuine via scripts/verify-nt-candidates.mjs. Public-domain only.
 */
const NT_CURATED = {
  "The Annunciation": "Gustave Dore - The Annunciation.jpg",
  "The Baptism of Jesus": "Gustave Dore - John the Baptist baptizes Jesus.jpg",
  "The Sermon on the Mount": "Dore Bible Sermon on the Mount.jpg",
  "Jesus Stilling the Tempest": "JesusCalmingtheTempestDore.jpg",
  "The Transfiguration": "Gustave Dore - The Transfiguration.jpg",
  "The Return of the Prodigal Son": "Gustave Dore - The prodigal son decides to return to his father.jpg",
  "Lazarus at the Rich Man's House": "Gustave Dore Lazarus and the Rich Man.jpg",
  "The Judas Kiss": "Gustave Doré - The Holy Bible - Plate CXLI, The Judas Kiss.jpg",
  "Peter Denying Christ": "Gustave Doré, St Peter Denying Christ.jpg",
  "The Ascension": "Gustave Doré - L'Ascension.jpg",
};

async function apiJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  return res.json();
}

async function fetchCategoryFiles() {
  const files = [];
  let cont;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmtype: "file",
      cmlimit: "500",
    };
    if (cont) params.cmcontinue = cont;
    const r = await apiJson(params);
    for (const m of r.query?.categorymembers ?? []) {
      files.push(m.title.replace(/^File:/, ""));
    }
    cont = r.continue?.cmcontinue;
  } while (cont);
  return files;
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const catFiles = await fetchCategoryFiles();
console.log(`Fetched ${catFiles.length} files from "${CATEGORY}"`);

/** normalized title body -> exact Commons filename (numbered OT/Apocrypha set). */
const byTitle = new Map();
for (const name of catFiles) {
  const m = name.match(/^(\d{3})\.\s*(.+)\.jpe?g$/i);
  if (!m) continue;
  byTitle.set(normalize(m[2]), name);
}

function resolveScene(scene) {
  // Explicit override in the scene index always wins.
  if (scene.file) return { filename: scene.file, method: "override" };

  // New Testament curated set (matched by exact title).
  const nt = NT_CURATED[scene.t];
  if (nt) return { filename: nt, method: "nt-curated" };

  // OT / Apocrypha: match by title against the authoritative category.
  const want = normalize(scene.t);
  if (byTitle.has(want)) return { filename: byTitle.get(want), method: "title-exact" };

  for (const [body, name] of byTitle) {
    if (body === want) return { filename: name, method: "title-exact" };
  }
  for (const [body, name] of byTitle) {
    if (body.includes(want) || want.includes(body)) {
      return { filename: name, method: "title-fuzzy" };
    }
  }
  return { filename: null, method: "unresolved" };
}

const results = [];
let resolved = 0;
for (const scene of scenes) {
  const { filename, method } = resolveScene(scene);
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
}

writeFileSync(OUT, JSON.stringify(results, null, 2), "utf8");
console.log(`\nResolved ${resolved}/${scenes.length} → ${OUT}`);
const missing = results.filter((r) => !r.filename);
if (missing.length) {
  console.log("Unresolved scenes (dropped from generated plates):");
  for (const m of missing) console.log(`  ${m.n} ${m.t} (${m.r})`);
}
