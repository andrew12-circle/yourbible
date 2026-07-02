/**
 * Generate src/data/biblePlates/tissotPlates.json from scripts/data/tissot-discovered.json
 *
 * Usage: node scripts/gen-tissot-plates.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IN = join(__dirname, "data", "tissot-discovered.json");
const OUT = join(ROOT, "src", "data", "biblePlates", "tissotPlates.json");

const discovered = JSON.parse(readFileSync(IN, "utf8"));

const plates = discovered.resolved.map((entry) => ({
  id: entry.id,
  bookAbbr: entry.bookAbbr,
  chapter: entry.chapter,
  beforeVerse: entry.beforeVerse,
  title: entry.title,
  referenceLabel: entry.referenceLabel,
  imageUrl: entry.thumbUrl,
  alt: `${entry.title} — ${entry.referenceLabel}`,
  artist: entry.artist ?? "James Tissot",
  kind: "artwork",
  source: entry.brooklyn ? "brooklyn" : "wikimedia",
  sourceUrl: entry.sourceUrl,
  license: "pd",
  priority:
    /crucifixion|raising of the cross|death of jesus|élévation de la croix/i.test(entry.title)
      ? 3
      : entry.brooklyn
        ? 4
        : 5,
}));

writeFileSync(OUT, JSON.stringify(plates, null, 2) + "\n");
console.log(`Wrote ${plates.length} Tissot plates → ${OUT}`);
