/**
 * Verify the locally bundled reader artwork without making any network calls.
 *
 * The source catalogs are authoritative. This check confirms every catalogued
 * plate and study map has a corresponding local WebP plus a complete manifest
 * record whose provenance, file size, hash, and dimensions still match.
 *
 * Usage: npm run verify:bible-plate-bundle
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const BUNDLE_DIR = join(PUBLIC_DIR, "bible-plates");
const MANIFEST_PATH = join(BUNDLE_DIR, "manifest.json");
const MAX_WEBP_BYTES = 5_000_000;
const EXPECTED_PLATE_COUNT = 527;
const EXPECTED_MAP_COUNT = 8;

const catalogPaths = {
  dore: "src/data/biblePlates/dorePlates.json",
  tissot: "src/data/biblePlates/tissotPlates.json",
  extra: "src/data/biblePlates/extraPlates.ts",
  maps: "src/lib/bible/studyBackMatter.ts",
};

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

function safeId(id, description) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
    throw new Error("Unsafe " + description + " id: " + String(id));
  }
  return id;
}

function stringProperty(objectText, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = objectText.match(
    new RegExp("\\b" + escaped + "\\s*:\\s*(?:\"([^\"]*)\"|'([^']*)'|\\x60([^\\x60]*)\\x60)", "m"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

/**
 * The two TypeScript catalogs are literal object arrays. Parsing those records
 * keeps this verifier independent from the browser bundler and avoids running
 * application source while still reading the same authoritative catalog data.
 */
function literalObjectBlocks(relativePath, declaration) {
  const text = readFileSync(join(ROOT, relativePath), "utf8");
  const declarationOffset = text.indexOf(declaration);
  if (declarationOffset === -1) {
    throw new Error("Could not find " + declaration + " in " + relativePath);
  }

  const assignmentOffset = text.indexOf("=", declarationOffset);
  if (assignmentOffset === -1) {
    throw new Error("Could not find assignment for " + declaration + " in " + relativePath);
  }
  const arrayStart = text.indexOf("[", assignmentOffset);
  if (arrayStart === -1) {
    throw new Error("Could not find array for " + declaration + " in " + relativePath);
  }

  const blocks = [];
  let depth = 0;
  let objectStart = -1;
  let quote = "";
  let escaped = false;

  for (let index = arrayStart + 1; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === "\"" || character === "'" || character === "\x60") {
      quote = character;
      continue;
    }
    if (character === "{") {
      if (depth === 0) objectStart = index;
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0 && objectStart !== -1) {
        blocks.push(text.slice(objectStart, index + 1));
        objectStart = -1;
      }
      continue;
    }
    if (character === "]" && depth === 0) break;
  }

  return blocks;
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Missing " + label);
  }
  return value;
}

function catalogPlateEntries() {
  const literalPlates = literalObjectBlocks(catalogPaths.extra, "export const EXTRA_PLATES").map((block) => ({
    id: stringProperty(block, "id"),
    title: stringProperty(block, "title"),
    referenceLabel: stringProperty(block, "referenceLabel"),
    imageUrl: stringProperty(block, "imageUrl"),
    sourceUrl: stringProperty(block, "sourceUrl"),
    artist: stringProperty(block, "artist"),
    source: stringProperty(block, "source"),
    license: stringProperty(block, "license"),
  }));

  const catalogs = [
    { catalog: catalogPaths.dore, plates: readJson(catalogPaths.dore) },
    { catalog: catalogPaths.tissot, plates: readJson(catalogPaths.tissot) },
    { catalog: catalogPaths.extra, plates: literalPlates },
  ];

  return catalogs.flatMap(({ catalog, plates }) => plates.map((plate) => ({
    id: safeId(plate.id, "plate"),
    kind: "plate",
    title: requiredString(plate.title, "title for plate " + plate.id),
    referenceLabel: plate.referenceLabel ?? null,
    imageUrl: requiredString(plate.imageUrl, "imageUrl for plate " + plate.id),
    sourceUrl: requiredString(plate.sourceUrl, "sourceUrl for plate " + plate.id),
    artist: plate.artist ?? null,
    source: requiredString(plate.source, "source for plate " + plate.id),
    license: plate.license ?? null,
    catalog,
  })));
}

function catalogMapEntries() {
  return literalObjectBlocks(catalogPaths.maps, "export const STUDY_MAPS").map((block) => {
    const id = safeId(stringProperty(block, "id"), "map");
    return {
      id,
      kind: "map",
      title: requiredString(stringProperty(block, "title"), "title for map " + id),
      referenceLabel: null,
      imageUrl: requiredString(stringProperty(block, "imageUrl"), "imageUrl for map " + id),
      sourceUrl: requiredString(stringProperty(block, "sourceUrl"), "sourceUrl for map " + id),
      artist: stringProperty(block, "artist") ?? null,
      source: "wikimedia",
      license: stringProperty(block, "license") ?? null,
      catalog: catalogPaths.maps,
    };
  });
}

function expectedAssetPath(entry) {
  const relativePath = entry.kind === "map"
    ? join("bible-plates", "maps", entry.id + ".webp")
    : join("bible-plates", entry.id + ".webp");
  return {
    absolute: join(PUBLIC_DIR, relativePath),
    publicPath: "/" + relativePath.replaceAll("\\", "/"),
  };
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function sameNullableString(actual, expected) {
  return (actual ?? null) === (expected ?? null);
}

function httpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function manifestKey(entry) {
  return entry.kind + ":" + entry.id;
}

function addManifestProvenanceIssues(issues, entry, manifestEntry, assetPath) {
  const pathLabel = relative(ROOT, assetPath.absolute);
  const expectedFields = [
    ["kind", entry.kind],
    ["path", assetPath.publicPath],
    ["title", entry.title],
    ["referenceLabel", entry.referenceLabel],
    ["artist", entry.artist],
    ["source", entry.source],
    ["license", entry.license],
    ["catalog", entry.catalog],
    ["sourceUrl", entry.sourceUrl],
    ["originalImageUrl", entry.imageUrl],
  ];

  for (const [field, expected] of expectedFields) {
    if (!sameNullableString(manifestEntry[field], expected)) {
      issues.push(entry.id + ": manifest " + field + " does not match its source catalog");
    }
  }

  for (const field of ["fetchUrl", "resolvedUrl"]) {
    if (!httpsUrl(manifestEntry[field])) {
      issues.push(entry.id + ": manifest " + field + " is missing a valid HTTPS provenance URL");
    }
  }
  if (!isNonNegativeInteger(manifestEntry.sourceBytes) || manifestEntry.sourceBytes === 0) {
    issues.push(entry.id + ": manifest sourceBytes is missing or invalid");
  }
  if (!isSha256(manifestEntry.sourceSha256)) {
    issues.push(entry.id + ": manifest sourceSha256 is missing or invalid");
  }
  if (!isSha256(manifestEntry.webpSha256)) {
    issues.push(entry.id + ": manifest webpSha256 is missing or invalid");
  }
  if (!isNonNegativeInteger(manifestEntry.bytes) || manifestEntry.bytes === 0) {
    issues.push(entry.id + ": manifest bytes is missing or invalid");
  }
  if (!isNonNegativeInteger(manifestEntry.width) || manifestEntry.width === 0) {
    issues.push(entry.id + ": manifest width is missing or invalid");
  }
  if (!isNonNegativeInteger(manifestEntry.height) || manifestEntry.height === 0) {
    issues.push(entry.id + ": manifest height is missing or invalid");
  }
  if (manifestEntry.bytes >= MAX_WEBP_BYTES) {
    issues.push(entry.id + ": manifest records a WebP at or above the 5 MB cap");
  }
  if (manifestEntry.path !== assetPath.publicPath) {
    issues.push(entry.id + ": manifest path is not the expected local WebP path (" + pathLabel + ")");
  }
}

async function verifyAsset(entry, manifestEntry, issues) {
  const assetPath = expectedAssetPath(entry);
  const pathLabel = relative(ROOT, assetPath.absolute);
  if (!existsSync(assetPath.absolute)) {
    issues.push(entry.id + ": missing " + pathLabel);
    return 0;
  }

  const fileStat = statSync(assetPath.absolute);
  if (!fileStat.isFile()) {
    issues.push(entry.id + ": expected file at " + pathLabel);
    return 0;
  }
  if (fileStat.size === 0) {
    issues.push(entry.id + ": empty WebP at " + pathLabel);
  }
  if (fileStat.size >= MAX_WEBP_BYTES) {
    issues.push(entry.id + ": WebP is " + fileStat.size + " bytes, at or above the 5 MB cap");
  }

  const fileBytes = readFileSync(assetPath.absolute);
  const localHash = sha256(fileBytes);
  if (manifestEntry.bytes !== fileStat.size) {
    issues.push(entry.id + ": manifest byte count does not match " + pathLabel);
  }
  if (manifestEntry.webpSha256 !== localHash) {
    issues.push(entry.id + ": manifest WebP SHA-256 does not match " + pathLabel);
  }

  try {
    const metadata = await sharp(fileBytes, { failOn: "error" }).metadata();
    if (metadata.format !== "webp") {
      issues.push(entry.id + ": local asset is " + (metadata.format ?? "not an image") + ", not WebP");
    }
    if (!metadata.width || !metadata.height) {
      issues.push(entry.id + ": local WebP has invalid dimensions");
    } else {
      if (manifestEntry.width !== metadata.width || manifestEntry.height !== metadata.height) {
        issues.push(entry.id + ": manifest dimensions do not match local WebP");
      }
    }
  } catch (error) {
    issues.push(
      entry.id + ": could not decode local WebP ("
      + (error instanceof Error ? error.message : String(error)) + ")",
    );
  }

  return fileStat.size;
}

function makeExpectedEntries() {
  const plates = catalogPlateEntries();
  const maps = catalogMapEntries();
  if (plates.length !== EXPECTED_PLATE_COUNT || maps.length !== EXPECTED_MAP_COUNT) {
    throw new Error(
      "Source catalog count changed: expected " + EXPECTED_PLATE_COUNT + " plates and "
      + EXPECTED_MAP_COUNT + " maps, found " + plates.length + " plates and " + maps.length
      + " maps. Update this verifier intentionally with the catalog change.",
    );
  }

  const entries = [...plates, ...maps];
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error("Duplicate Bible artwork id in source catalogs: " + entry.id);
    ids.add(entry.id);
  }
  return { entries, plates, maps };
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error("Missing local Bible artwork manifest: " + relative(ROOT, MANIFEST_PATH));
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.entries)) {
    throw new Error("Bible artwork manifest must contain an entries array");
  }
  return manifest;
}

async function main() {
  const { entries, plates, maps } = makeExpectedEntries();
  const manifest = readManifest();
  const issues = [];

  if (manifest.schemaVersion !== 1) {
    issues.push("manifest schemaVersion must be 1");
  }
  if (!Array.isArray(manifest.failures)) {
    issues.push("manifest failures must be an array");
  } else if (manifest.failures.length > 0) {
    issues.push("manifest reports " + manifest.failures.length + " failed source group(s)");
  }

  const manifestEntries = new Map();
  for (const candidate of manifest.entries) {
    if (!candidate || typeof candidate.id !== "string" || typeof candidate.kind !== "string") {
      issues.push("manifest contains an entry without a valid id and kind");
      continue;
    }
    const key = manifestKey(candidate);
    if (manifestEntries.has(key)) {
      issues.push("manifest contains duplicate entry " + key);
      continue;
    }
    manifestEntries.set(key, candidate);
  }

  const expectedKeys = new Set(entries.map(manifestKey));
  for (const key of manifestEntries.keys()) {
    if (!expectedKeys.has(key)) issues.push("manifest contains stale or unknown entry " + key);
  }
  if (manifestEntries.size !== entries.length) {
    issues.push("manifest has " + manifestEntries.size + " unique entries; expected " + entries.length);
  }

  let totalBytes = 0;
  for (const entry of entries) {
    const manifestEntry = manifestEntries.get(manifestKey(entry));
    if (!manifestEntry) {
      issues.push(entry.id + ": missing manifest entry");
      continue;
    }
    addManifestProvenanceIssues(issues, entry, manifestEntry, expectedAssetPath(entry));
    totalBytes += await verifyAsset(entry, manifestEntry, issues);
  }

  const summary = manifest.summary;
  if (!summary || typeof summary !== "object") {
    issues.push("manifest summary is missing");
  } else {
    if (summary.mappedEntries !== entries.length) {
      issues.push("manifest summary mappedEntries does not match the source catalogs");
    }
    if (summary.completedEntries !== entries.length) {
      issues.push("manifest summary completedEntries does not match the source catalogs");
    }
    if (summary.failedEntries !== 0) {
      issues.push("manifest summary failedEntries is not zero");
    }
    if (summary.totalWebpBytes !== totalBytes) {
      issues.push("manifest summary totalWebpBytes does not match local assets");
    }
  }

  const totalMiB = (totalBytes / (1024 * 1024)).toFixed(2);
  if (issues.length) {
    console.error("Bible artwork bundle verification failed (" + issues.length + " issue(s)):");
    for (const issue of issues) console.error("  - " + issue);
    console.error(
      "\nChecked " + plates.length + " plates + " + maps.length + " maps ("
      + entries.length + " expected local WebPs; " + totalMiB + " MiB present).",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "Bible artwork bundle verified: " + plates.length + " plates + " + maps.length + " maps = "
    + entries.length + " local WebPs (" + totalMiB + " MiB).",
  );
  console.log("Manifest: " + relative(ROOT, MANIFEST_PATH));
}

await main();
