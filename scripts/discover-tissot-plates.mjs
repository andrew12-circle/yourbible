/**
 * Discover James Tissot Bible plates from Wikimedia Commons categories.
 *
 * Sources:
 *  - Category:The Life of Jesus Christ by James Tissot (Brooklyn watercolors, NT)
 *  - Category:Old Testament by James Tissot (Medhurst scans + misc OT)
 *
 * Usage: node scripts/discover-tissot-plates.mjs
 * Output: scripts/data/tissot-discovered.json
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanTissotTitle,
  resolveTissotPassage,
  shouldSkipTissotFile,
  slugify,
} from "./lib/tissotPassageResolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data", "tissot-discovered.json");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "yourbible-plate-discovery/1.0 (dev script; Tissot discovery)";
const CATEGORIES = [
  "Category:The Life of Jesus Christ by James Tissot",
  "Category:Old Testament by James Tissot",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiJson(params, attempt = 0) {
  await sleep(attempt === 0 ? 2200 : 4000 * (attempt + 1));
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  const res = await fetch(u, { headers: { "User-Agent": UA } });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (attempt < 8) return apiJson(params, attempt + 1);
    throw new Error(`API non-JSON: ${text.slice(0, 100)}`);
  }
}

async function fetchCategoryFiles(cmtitle) {
  const files = [];
  let cont;
  do {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle,
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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchImageMeta(filenames) {
  const meta = {};
  for (const batch of chunk(filenames, 40)) {
    const titles = batch.map((f) => `File:${f}`).join("|");
    const r = await apiJson({
      action: "query",
      titles,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "960",
    });
    for (const page of Object.values(r.query?.pages ?? {})) {
      if (page.missing) continue;
      const filename = page.title.replace(/^File:/, "");
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const em = ii.extmetadata ?? {};
      meta[filename] = {
        thumbUrl: ii.thumburl ?? ii.url,
        sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename.replace(/ /g, "_"))}`,
        objectName: em.ObjectName?.value?.replace(/<[^>]+>/g, "") ?? "",
        credit: em.Credit?.value?.replace(/<[^>]+>/g, "") ?? "",
        artist: em.Artist?.value?.replace(/<[^>]+>/g, "") ?? "James Tissot",
      };
    }
  }
  return meta;
}

function preferFile(a, b) {
  const score = (f) => {
    let s = 0;
    if (/Brooklyn Museum/.test(f)) s += 10;
    if (/overall\.jpg$/i.test(f)) s += 5;
    if (/Google Art Project/i.test(f)) s += 8;
    if (/Medhurst/i.test(f)) s += 2;
    if (/cropped/i.test(f)) s -= 3;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

async function main() {
  console.log("Fetching Tissot categories from Wikimedia Commons…\n");
  const allFiles = new Set();
  for (const cat of CATEGORIES) {
    const files = await fetchCategoryFiles(cat);
    console.log(`  ${cat}: ${files.length} files`);
    for (const f of files) allFiles.add(f);
  }

  const candidates = [...allFiles].filter((f) => !shouldSkipTissotFile(f));
  console.log(`\n${candidates.length} candidate files after filtering location/costume sketches.`);

  console.log("Fetching image metadata (thumbs + titles)…");
  const metaByFile = await fetchImageMeta(candidates);

  const resolved = [];
  const unresolved = [];
  /** Dedupe by passage slot — keep best file per book/chapter/verse. */
  const slotBest = new Map();

  for (const filename of candidates) {
    const meta = metaByFile[filename];
    if (!meta?.thumbUrl) {
      unresolved.push({ filename, reason: "no-thumb" });
      continue;
    }

    const passage = resolveTissotPassage(filename, meta.objectName);
    if (!passage) {
      unresolved.push({ filename, reason: "no-passage", title: cleanTissotTitle(filename, meta.objectName) });
      continue;
    }

    const slotKey = `${passage.bookAbbr}:${passage.chapter}:${passage.beforeVerse}`;
    const prev = slotBest.get(slotKey);
    if (prev && preferFile(prev.filename, filename) === prev.filename) continue;

    const title = cleanTissotTitle(filename, meta.objectName);
    slotBest.set(slotKey, {
      filename,
      title,
      ...passage,
      thumbUrl: meta.thumbUrl,
      sourceUrl: meta.sourceUrl,
      artist: meta.artist.includes("Tissot") ? "James Tissot" : meta.artist,
      brooklyn: /Brooklyn Museum/.test(filename),
    });
  }

  for (const entry of slotBest.values()) {
    const id = `tissot-${entry.bookAbbr.toLowerCase()}-${entry.chapter}-${entry.beforeVerse}-${slugify(entry.title)}`;
    resolved.push({
      id,
      bookAbbr: entry.bookAbbr,
      chapter: entry.chapter,
      beforeVerse: entry.beforeVerse,
      title: entry.title,
      referenceLabel: `${entry.bookAbbr} ${entry.chapter}:${entry.beforeVerse}`,
      filename: entry.filename,
      thumbUrl: entry.thumbUrl,
      sourceUrl: entry.sourceUrl,
      artist: entry.artist,
      brooklyn: entry.brooklyn,
    });
  }

  resolved.sort((a, b) => {
    if (a.bookAbbr !== b.bookAbbr) return a.bookAbbr.localeCompare(b.bookAbbr);
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.beforeVerse - b.beforeVerse;
  });

  const out = {
    generatedAt: new Date().toISOString(),
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
    resolved,
    unresolved: unresolved.slice(0, 80),
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n${resolved.length} plates resolved → ${OUT}`);
  console.log(`${unresolved.length} unresolved (see JSON for samples).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
