/**
 * Generates src/data/biblePlates/dorePlates.generated.ts from scripts/data/doreScenes.js
 * Usage: node scripts/gen-bible-plates.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import scenes from "./data/doreScenes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "src", "data", "biblePlates", "dorePlates.json");
const THUMB_WIDTH = 960;

function commonsThumbUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${THUMB_WIDTH}`;
}

function commonsPageUrl(filename) {
  const slug = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/File:${slug}`;
}

function titleToFilename(num, title) {
  const prefix = String(num).padStart(3, "0");
  const slug = title.replace(/\s+/g, "_").replace(/_+/g, "_");
  return `${prefix}.${slug}.jpg`;
}

function sceneToPlate(scene) {
  const filename = scene.file ?? titleToFilename(scene.n, scene.t);
  const id = `dore-${String(scene.n).padStart(3, "0")}-${scene.b.toLowerCase()}-${scene.c}`;
  return {
    id,
    bookAbbr: scene.b,
    chapter: scene.c,
    beforeVerse: scene.v,
    title: scene.t,
    referenceLabel: scene.r,
    imageUrl: commonsThumbUrl(filename),
    alt: `${scene.t} — ${scene.r}`,
    artist: "Gustave Doré",
    kind: "artwork",
    source: "wikimedia",
    sourceUrl: commonsPageUrl(filename),
    license: "pd",
    priority: scene.p ?? 10,
  };
}

const CRUCIFIXION_FILE = "Gustave_Doré_-_Crucifixion_of_Jesus.jpg";

const plates = [];
for (const scene of scenes) {
  const plate = sceneToPlate(scene);
  if (scene.t === "The Crucifixion" || scene.file === CRUCIFIXION_FILE) {
    for (const abbr of ["Mat", "Mrk", "Luk", "Jhn"]) {
      plates.push({
        ...plate,
        id: `dore-crucifixion-${abbr.toLowerCase()}-${scene.c}`,
        bookAbbr: abbr,
        imageUrl: commonsThumbUrl(CRUCIFIXION_FILE),
        referenceLabel:
          abbr === "Mat"
            ? "Matthew 27:35"
            : abbr === "Mrk"
              ? "Mark 15:24"
              : abbr === "Luk"
                ? "Luke 23:33"
                : "John 19:18",
      });
    }
    continue;
  }
  plates.push(plate);
}

function emitJson(items) {
  return JSON.stringify(items, null, 2);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, emitJson(plates), "utf8");
console.log(`Wrote ${plates.length} Doré plates → ${OUT_PATH}`);
