/**
 * Re-resolve Tissot passages from cached metadata (no Wikimedia API calls).
 * Usage: node scripts/reresolve-tissot-plates.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBrooklynAccession } from "./lib/brooklynAccessionPassage.mjs";
import {
  cleanTissotTitle,
  resolveTissotPassage,
  slugify,
} from "./lib/tissotPassageResolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, "data", "tissot-metadata-cache.json");
const OUT = join(__dirname, "data", "tissot-discovered.json");

const { candidates, metaByFile } = JSON.parse(readFileSync(CACHE, "utf8"));

function preferFile(a, b) {
  const score = (f) => {
    let s = 0;
    if (/Brooklyn Museum/.test(f)) s += 10;
    if (/overall\.jpg$/i.test(f)) s += 5;
    if (/Google Art Project/i.test(f)) s += 8;
    if (/Medhurst/i.test(f)) s += 2;
    if (/cropped/i.test(f)) s -= 3;
    if (/FXD/i.test(f)) s -= 2;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

const resolved = [];
const unresolved = [];
/** Non-Brooklyn: one plate per passage slot. Brooklyn: one plate per accession number. */
const slotBest = new Map();
const accessionBest = new Map();

for (const filename of candidates) {
  const meta = metaByFile[filename];
  if (!meta?.thumbUrl) {
    unresolved.push({ filename, reason: "no-thumb" });
    continue;
  }

  const passage = resolveTissotPassage(filename, meta.objectName, meta.credit);
  if (!passage) {
    unresolved.push({ filename, reason: "no-passage", title: cleanTissotTitle(filename, meta.objectName) });
    continue;
  }

  const isBrooklyn = filename.includes("Brooklyn Museum");
  const accession = extractBrooklynAccession(meta.credit, filename);
  const title = cleanTissotTitle(filename, meta.objectName);

  const entry = {
    filename,
    title,
    ...passage,
    thumbUrl: meta.thumbUrl,
    sourceUrl: meta.sourceUrl,
    artist: meta.artist?.includes("Tissot") ? "James Tissot" : meta.artist,
    brooklyn: isBrooklyn,
    accession,
  };

  if (isBrooklyn && accession != null) {
    const prev = accessionBest.get(accession);
    if (prev && preferFile(prev.filename, filename) === prev.filename) continue;
    accessionBest.set(accession, entry);
    continue;
  }

  const slotKey = `${passage.bookAbbr}:${passage.chapter}:${passage.beforeVerse}`;
  const prev = slotBest.get(slotKey);
  if (prev && preferFile(prev.filename, filename) === prev.filename) continue;
  slotBest.set(slotKey, entry);
}

for (const entry of [...accessionBest.values(), ...slotBest.values()]) {
  const id =
    entry.accession != null
      ? `tissot-bk-${String(entry.accession).padStart(3, "0")}-${slugify(entry.title)}`
      : `tissot-${entry.bookAbbr.toLowerCase()}-${entry.chapter}-${entry.beforeVerse}-${slugify(entry.title)}`;

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
    accession: entry.accession ?? undefined,
  });
}

resolved.sort((a, b) => {
  if (a.bookAbbr !== b.bookAbbr) return a.bookAbbr.localeCompare(b.bookAbbr);
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  if (a.beforeVerse !== b.beforeVerse) return a.beforeVerse - b.beforeVerse;
  return (a.accession ?? 0) - (b.accession ?? 0);
});

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      resolvedCount: resolved.length,
      unresolvedCount: unresolved.length,
      brooklynCount: resolved.filter((r) => r.brooklyn).length,
      resolved,
      unresolved: unresolved.slice(0, 80),
    },
    null,
    2,
  ),
);

console.log(
  `${resolved.length} plates resolved (${resolved.filter((r) => r.brooklyn).length} Brooklyn, ${unresolved.length} unresolved)`,
);
