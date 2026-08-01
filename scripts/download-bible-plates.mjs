/**
 * Materialize the reader's public Bible artwork and maps as local WebP files.
 *
 * This deliberately reads the existing plate/map catalogs instead of maintaining
 * a second hand-written image list. Every asset keeps its original Wikimedia
 * source page, catalog attribution, source-byte hash, and local WebP hash in
 * public/bible-plates/manifest.json.
 *
 * Usage:
 *   npm run download:bible-plates
 *   npm run download:bible-plates -- --clean --force
 *
 * Every Commons catalog image is resolved in small imageinfo batches to a
 * 960px CDN thumbnail before downloading. CDN requests are throttled, retried,
 * and converted to WebP smaller than 5 MB.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const OUTPUT_DIR = join(PUBLIC_DIR, "bible-plates");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");
const THUMBNAIL_CACHE_PATH = join(OUTPUT_DIR, "commons-thumbnail-cache.json");

const DERIVATIVE_WIDTH = 960;
const MAX_OUTPUT_BYTES = 4_900_000;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 60_000;
const MIN_429_COOLDOWN_MS = 300_000;
const USER_AGENT = "YourBible/1.0 (+https://github.com/andrew12-circle/yourbible; contact via GitHub)";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const force = process.argv.includes("--force");
const clean = process.argv.includes("--clean");
const delayArg = process.argv.find((arg) => arg.startsWith("--delay-ms="));
const warmupArg = process.argv.find((arg) => arg.startsWith("--warmup-ms="));
const THUMBNAIL_REQUEST_DELAY_MS = Math.max(
  4_000,
  Number.parseInt(delayArg?.slice("--delay-ms=".length) ?? process.env.PLATE_DOWNLOAD_DELAY_MS ?? "4000", 10)
    || 4000,
);
const CDN_WARMUP_MS = Math.max(
  0,
  Number.parseInt(warmupArg?.slice("--warmup-ms=".length) ?? process.env.PLATE_DOWNLOAD_WARMUP_MS ?? "0", 10)
    || 0,
);
const COMMONS_API_REQUEST_DELAY_MS = 5_000;
const THUMBNAIL_WORKER_COUNT = 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rateLimitEvents = [];
const sourceFiles = {
  dore: "src/data/biblePlates/dorePlates.json",
  tissot: "src/data/biblePlates/tissotPlates.json",
  extra: "src/data/biblePlates/extraPlates.ts",
  maps: "src/lib/bible/studyBackMatter.ts",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));
}

async function writeJsonAtomically(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const nextPath = path + ".next";
  const contents = JSON.stringify(value, null, 2) + "\n";
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      writeFileSync(nextPath, contents, "utf8");
      renameSync(nextPath, path);
      return;
    } catch (error) {
      lastError = error;
      const code = typeof error === "object" && error ? error.code : undefined;
      if (code !== "EPERM" && code !== "EBUSY") throw error;
      await sleep(150 * (attempt + 1));
    }
  }
  try {
    // OneDrive can momentarily hold a rename lock; direct replacement preserves
    // the last durable checkpoint instead of aborting a long asset download.
    writeFileSync(path, contents, "utf8");
  } catch {
    throw lastError;
  }
}

function safeId(id, description) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
    throw new Error("Unsafe " + description + " id: " + id);
  }
  return id;
}

function stringProperty(objectText, property) {
  const escaped = property.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const match = objectText.match(
    new RegExp("\\b" + escaped + "\\s*:\\s*(?:\"([^\"]*)\"|'([^']*)'|\\x60([^\\x60]*)\\x60)", "m"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

/**
 * Current handwritten source arrays contain literal object records. We only
 * need their scalar fields, so parsing these blocks avoids executing TS source.
 */
function literalObjectBlocks(relativePath, declaration) {
  const text = readFileSync(join(ROOT, relativePath), "utf8");
  const start = text.indexOf(declaration);
  if (start === -1) throw new Error("Could not find " + declaration + " in " + relativePath);
  const assignment = text.indexOf("=", start);
  if (assignment === -1) throw new Error("Could not find assignment for " + declaration + " in " + relativePath);
  const arrayStart = text.indexOf("[", assignment);
  if (arrayStart === -1) throw new Error("Could not find array for " + declaration + " in " + relativePath);

  const blocks = [];
  let depth = 0;
  let objectStart = -1;
  let quote = "";
  let escaped = false;
  for (let index = arrayStart + 1; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "\"" || char === "'" || char === "\x60") {
      quote = char;
      continue;
    }
    if (char === "{") {
      if (depth === 0) objectStart = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && objectStart !== -1) {
        blocks.push(text.slice(objectStart, index + 1));
        objectStart = -1;
      }
      continue;
    }
    if (char === "]" && depth === 0) break;
  }
  return blocks;
}

function commonsFilenameFromSourceUrl(sourceUrl) {
  if (!sourceUrl) return undefined;
  const parsed = new URL(sourceUrl);
  if (parsed.hostname !== "commons.wikimedia.org") return undefined;
  const prefix = "/wiki/File:";
  if (!parsed.pathname.startsWith(prefix)) return undefined;
  return decodeURIComponent(parsed.pathname.slice(prefix.length)).replaceAll("_", " ");
}

function commonsFilenameFromImageUrl(imageUrl) {
  const parsed = new URL(imageUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const thumbIndex = segments.indexOf("thumb");
  if (thumbIndex !== -1 && segments.length > thumbIndex + 3) {
    return decodeURIComponent(segments[thumbIndex + 3]);
  }
  return decodeURIComponent(segments.at(-1) ?? "");
}

function commonsSourceUrlFromImageUrl(imageUrl) {
  const filename = commonsFilenameFromImageUrl(imageUrl);
  if (!filename) throw new Error("Could not derive Wikimedia filename from " + imageUrl);
  return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(filename.replaceAll(" ", "_"));
}

function fileKey(title) {
  return title
    .replace(/^File:/i, "")
    .replaceAll("_", " ")
    .normalize("NFC")
    .toLocaleLowerCase("en-US");
}

function commonsFileTitle(entry) {
  const filename = commonsFilenameFromSourceUrl(entry.sourceUrl) ?? commonsFilenameFromImageUrl(entry.imageUrl);
  if (!filename) throw new Error("Could not derive a Commons file title for " + entry.id);
  return "File:" + filename;
}

function catalogPlateEntries() {
  const catalogArrays = [
    { catalog: sourceFiles.dore, plates: readJson(sourceFiles.dore) },
    { catalog: sourceFiles.tissot, plates: readJson(sourceFiles.tissot) },
    {
      catalog: sourceFiles.extra,
      plates: literalObjectBlocks(sourceFiles.extra, "export const EXTRA_PLATES").map((block) => ({
        id: stringProperty(block, "id"),
        title: stringProperty(block, "title"),
        referenceLabel: stringProperty(block, "referenceLabel"),
        imageUrl: stringProperty(block, "imageUrl"),
        sourceUrl: stringProperty(block, "sourceUrl"),
        artist: stringProperty(block, "artist"),
        source: stringProperty(block, "source"),
        license: stringProperty(block, "license"),
      })),
    },
  ];

  return catalogArrays.flatMap(({ catalog, plates }) => plates.map((plate) => {
    if (!plate.id || !plate.title || !plate.imageUrl) {
      throw new Error("Incomplete plate source entry: " + JSON.stringify(plate));
    }
    safeId(plate.id, "plate");
    return {
      id: plate.id,
      kind: "plate",
      title: plate.title,
      referenceLabel: plate.referenceLabel ?? null,
      imageUrl: plate.imageUrl,
      sourceUrl: plate.sourceUrl ?? commonsSourceUrlFromImageUrl(plate.imageUrl),
      artist: plate.artist ?? null,
      source: plate.source ?? "wikimedia",
      license: plate.license ?? null,
      catalog,
    };
  }));
}

function catalogMapEntries() {
  return literalObjectBlocks(sourceFiles.maps, "export const STUDY_MAPS").map((block) => {
    const id = stringProperty(block, "id");
    const title = stringProperty(block, "title");
    const imageUrl = stringProperty(block, "imageUrl");
    const sourceUrl = stringProperty(block, "sourceUrl");
    if (!id || !title || !imageUrl) {
      throw new Error("Incomplete map source entry: " + block);
    }
    safeId(id, "map");
    return {
      id,
      kind: "map",
      title,
      referenceLabel: null,
      imageUrl,
      sourceUrl: sourceUrl ?? commonsSourceUrlFromImageUrl(imageUrl),
      artist: stringProperty(block, "artist") ?? null,
      source: "wikimedia",
      license: stringProperty(block, "license") ?? null,
      catalog: sourceFiles.maps,
    };
  });
}

function outputPathFor(entry) {
  const relativePath = entry.kind === "map"
    ? join("bible-plates", "maps", entry.id + ".webp")
    : join("bible-plates", entry.id + ".webp");
  return {
    absolute: join(PUBLIC_DIR, relativePath),
    publicPath: "/" + relativePath.split(sep).join("/"),
  };
}

function cleanGeneratedOutput() {
  const resolvedPublic = resolve(PUBLIC_DIR);
  const resolvedOutput = resolve(OUTPUT_DIR);
  const expectedOutput = resolve(PUBLIC_DIR, "bible-plates");
  if (
    resolvedOutput !== expectedOutput
    || !resolvedOutput.startsWith(resolvedPublic + sep)
    || resolvedOutput === resolvedPublic
  ) {
    throw new Error("Refusing to clean an unexpected output path: " + resolvedOutput);
  }
  rmSync(resolvedOutput, { recursive: true, force: true });
  mkdirSync(resolvedOutput, { recursive: true });
  console.log("Cleaned generated output: " + resolvedOutput);
}

function loadPreviousEntries() {
  if (!existsSync(MANIFEST_PATH)) return new Map();
  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    return new Map(
      (Array.isArray(manifest.entries) ? manifest.entries : [])
        .filter((entry) => entry?.id)
        .map((entry) => [entry.id, entry]),
    );
  } catch {
    console.warn("Ignoring unreadable previous Bible plate manifest.");
    return new Map();
  }
}

function priorAssetMatches(entry, previous) {
  if (!previous || previous.fetchUrl !== entry.fetchUrl || previous.originalImageUrl !== entry.imageUrl) {
    return false;
  }
  const output = outputPathFor(entry);
  return existsSync(output.absolute) && statSync(output.absolute).size > 0 && Boolean(previous.webpSha256);
}

function retryAfterMs(value) {
  if (!value) return undefined;
  const seconds = Number.parseFloat(value);
  if (Number.isFinite(seconds)) {
    const milliseconds = Math.ceil(seconds * 1000);
    return milliseconds > 0 ? milliseconds : undefined;
  }
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  const milliseconds = Math.max(0, date - Date.now());
  return milliseconds > 0 ? milliseconds : undefined;
}

class HttpError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const nextRequestAt = new Map();
async function throttle(url) {
  const host = new URL(url).host;
  const now = Date.now();
  const requestedStart = Math.max(now, nextRequestAt.get(host) ?? now);
  nextRequestAt.set(host, requestedStart + THUMBNAIL_REQUEST_DELAY_MS);
  if (requestedStart > now) await sleep(requestedStart - now);
}

function deferHost(url, durationMs) {
  const host = new URL(url).host;
  const minimumStart = Date.now() + durationMs;
  nextRequestAt.set(host, Math.max(nextRequestAt.get(host) ?? 0, minimumStart));
}

function isRetryable(error) {
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return true;
}

let nextCommonsApiRequestAt = 0;
async function throttleCommonsApi() {
  const now = Date.now();
  const requestedStart = Math.max(now, nextCommonsApiRequestAt);
  nextCommonsApiRequestAt = requestedStart + COMMONS_API_REQUEST_DELAY_MS;
  if (requestedStart > now) await sleep(requestedStart - now);
}

function deferCommonsApi(durationMs) {
  nextCommonsApiRequestAt = Math.max(nextCommonsApiRequestAt, Date.now() + durationMs);
}

async function fetchCommonsJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await throttleCommonsApi();
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new HttpError(
          "Commons imageinfo HTTP " + response.status,
          response.status,
          retryAfterMs(response.headers.get("retry-after")),
        );
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) break;
      const retryAfter = error instanceof HttpError ? error.retryAfter : undefined;
      const backoff = retryAfter ?? (
        error instanceof HttpError && error.status === 429
          ? Math.min(60_000, 5_000 * (2 ** (attempt - 1)))
          : Math.min(30_000, 1_250 * (2 ** (attempt - 1)))
      );
      if (error instanceof HttpError && error.status === 429) {
        const cooldownMs = Math.max(MIN_429_COOLDOWN_MS, backoff);
        deferCommonsApi(cooldownMs);
        rateLimitEvents.push({
          at: new Date().toISOString(),
          channel: "imageinfo",
          url,
          retryAfterMs: retryAfter ?? null,
          cooldownMs,
        });
      }
      console.warn(
        "  imageinfo retry " + attempt + "/" + (MAX_ATTEMPTS - 1) + " in "
        + Math.ceil(backoff / 1000) + "s",
      );
      await sleep(backoff);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function imageInfoBatches(titles) {
  const batches = [];
  let current = [];
  for (const title of titles) {
    const candidate = [...current, title];
    const query = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: String(DERIVATIVE_WIDTH),
      titles: candidate.join("|"),
    });
    if (current.length && (candidate.length > 40 || (COMMONS_API + "?" + query).length > 5_500)) {
      batches.push(current);
      current = [title];
    } else {
      current = candidate;
    }
  }
  if (current.length) batches.push(current);
  return batches;
}

function loadThumbnailCache() {
  if (!existsSync(THUMBNAIL_CACHE_PATH)) return new Map();
  try {
    const cache = JSON.parse(readFileSync(THUMBNAIL_CACHE_PATH, "utf8"));
    if (cache.schemaVersion !== 1 || cache.requestedWidth !== DERIVATIVE_WIDTH) return new Map();
    return new Map(
      Object.entries(cache.entries ?? {})
        .filter(([, value]) => typeof value?.thumbUrl === "string" && value.thumbUrl),
    );
  } catch {
    console.warn("Ignoring unreadable Commons thumbnail cache.");
    return new Map();
  }
}

async function saveThumbnailCache(cache) {
  await writeJsonAtomically(THUMBNAIL_CACHE_PATH, {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    requestedWidth: DERIVATIVE_WIDTH,
    entries: Object.fromEntries(cache),
  });
}

async function resolveCatalogThumbnails(entries) {
  const requested = new Map();
  for (const entry of entries) {
    const title = commonsFileTitle(entry);
    requested.set(fileKey(title), title);
  }
  const cache = loadThumbnailCache();
  const resolved = new Map();
  for (const [key] of requested) {
    const cached = cache.get(key);
    if (cached?.thumbUrl) resolved.set(key, cached.thumbUrl);
  }
  const missingTitles = [...requested.entries()]
    .filter(([key]) => !resolved.has(key))
    .map(([, title]) => title);
  const batches = imageInfoBatches(missingTitles);
  if (batches.length) {
    console.log(
      "Resolving " + missingTitles.length + " uncached Commons thumbnails in " + batches.length + " batch(es).",
    );
  }
  for (let index = 0; index < batches.length; index += 1) {
    const query = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: String(DERIVATIVE_WIDTH),
      titles: batches[index].join("|"),
    });
    const json = await fetchCommonsJson(COMMONS_API + "?" + query);
    for (const page of json.query?.pages ?? []) {
      const imageInfo = page.imageinfo?.[0];
      if (!page.missing && imageInfo?.thumburl) {
        resolved.set(fileKey(page.title), imageInfo.thumburl);
        cache.set(fileKey(page.title), {
          title: page.title,
          thumbUrl: imageInfo.thumburl,
        });
      }
    }
    await saveThumbnailCache(cache);
    console.log("  resolved Commons thumbnails " + (index + 1) + "/" + batches.length);
  }
  const missing = [...requested.entries()]
    .filter(([key]) => !resolved.has(key))
    .map(([, title]) => title);
  if (missing.length) {
    throw new Error("Commons imageinfo did not resolve " + missing.length + " catalog file(s): " + missing.join(", "));
  }
  return resolved;
}

async function downloadSource(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await throttle(url);
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          Accept: "image/avif,image/webp,image/*;q=0.8",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new HttpError(
          "HTTP " + response.status + " for " + url,
          response.status,
          retryAfterMs(response.headers.get("retry-after")),
        );
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error("Expected an image from " + url + ", got " + (contentType || "no content type"));
      }
      const declaredBytes = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
      if (declaredBytes > MAX_SOURCE_BYTES) {
        throw new Error("Derivative exceeds " + MAX_SOURCE_BYTES + " bytes: " + url);
      }
      const data = Buffer.from(await response.arrayBuffer());
      if (!data.length) throw new Error("Empty image response from " + url);
      if (data.length > MAX_SOURCE_BYTES) {
        throw new Error("Derivative exceeds " + MAX_SOURCE_BYTES + " bytes: " + url);
      }
      return {
        data,
        contentType,
        resolvedUrl: response.url,
      };
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) break;
      const retryAfter = error instanceof HttpError ? error.retryAfter : undefined;
      const backoff = retryAfter ?? (
        error instanceof HttpError && error.status === 429
          ? Math.min(60_000, 5_000 * (2 ** (attempt - 1)))
          : Math.min(30_000, 1_250 * (2 ** (attempt - 1)))
      );
      if (error instanceof HttpError && error.status === 429) {
        const cooldownMs = Math.max(MIN_429_COOLDOWN_MS, backoff);
        deferHost(url, cooldownMs);
        rateLimitEvents.push({
          at: new Date().toISOString(),
          channel: "cdn",
          url,
          retryAfterMs: retryAfter ?? null,
          cooldownMs,
        });
      }
      console.warn(
        "  retry " + attempt + "/" + (MAX_ATTEMPTS - 1) + " in " + Math.ceil(backoff / 1000)
        + "s: " + (error instanceof Error ? error.message : String(error)),
      );
      await sleep(backoff);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function convertToBoundedWebp(sourceBytes) {
  const widths = [DERIVATIVE_WIDTH, 1120, 960, 800, 640];
  const qualities = [76, 70, 64, 58];
  let smallest;
  for (const width of widths) {
    for (const quality of qualities) {
      const result = await sharp(sourceBytes, { limitInputPixels: 100_000_000, failOn: "error" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      if (!smallest || result.data.length < smallest.data.length) smallest = result;
      if (result.data.length < MAX_OUTPUT_BYTES) {
        return {
          data: result.data,
          width: result.info.width,
          height: result.info.height,
          quality,
        };
      }
    }
  }
  throw new Error(
    "Could not encode image below " + MAX_OUTPUT_BYTES + " bytes; smallest was "
    + (smallest?.data.length ?? "unknown") + " bytes",
  );
}

function manifestEntry(entry, source, converted, duplicateOf) {
  const output = outputPathFor(entry);
  return {
    id: entry.id,
    kind: entry.kind,
    path: output.publicPath,
    title: entry.title,
    referenceLabel: entry.referenceLabel,
    artist: entry.artist,
    source: entry.source,
    license: entry.license,
    catalog: entry.catalog,
    canonicalFileTitle: entry.canonicalFileTitle,
    sourceUrl: entry.sourceUrl,
    originalImageUrl: entry.imageUrl,
    fetchUrl: entry.fetchUrl,
    resolvedUrl: source.resolvedUrl,
    contentType: source.contentType,
    sourceBytes: source.data.length,
    sourceSha256: sha256(source.data),
    bytes: converted.data.length,
    webpSha256: sha256(converted.data),
    width: converted.width,
    height: converted.height,
    webpQuality: converted.quality,
    duplicateOf: duplicateOf ?? null,
  };
}

function priorManifestEntry(entry, previous) {
  const output = outputPathFor(entry);
  return {
    ...previous,
    id: entry.id,
    kind: entry.kind,
    path: output.publicPath,
    title: entry.title,
    referenceLabel: entry.referenceLabel,
    artist: entry.artist,
    source: entry.source,
    license: entry.license,
    catalog: entry.catalog,
    canonicalFileTitle: entry.canonicalFileTitle,
    sourceUrl: entry.sourceUrl,
    originalImageUrl: entry.imageUrl,
    fetchUrl: entry.fetchUrl,
  };
}

async function writeManifest(entries, failures, sourceGroups, downloadedGroups, reusedGroups, mappedEntries) {
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    derivative: {
      provider: "Wikimedia Commons imageinfo direct CDN thumbnails",
      requestedWidth: DERIVATIVE_WIDTH,
      outputFormat: "webp",
      maxOutputBytes: MAX_OUTPUT_BYTES,
      thumbnailRequestDelayMs: THUMBNAIL_REQUEST_DELAY_MS,
      imageInfoRequestDelayMs: COMMONS_API_REQUEST_DELAY_MS,
    },
    sources: sourceFiles,
    summary: {
      mappedEntries,
      completedEntries: entries.length,
      failedEntries: failures.reduce((sum, failure) => sum + failure.ids.length, 0),
      uniqueSourceUrls: sourceGroups,
      downloadedSourceUrls: downloadedGroups,
      reusedSourceUrls: reusedGroups,
      totalWebpBytes: totalBytes,
      rateLimitEvents: rateLimitEvents.length,
    },
    entries,
    failures,
    rateLimitEvents: rateLimitEvents.slice(-25),
  };
  await writeJsonAtomically(MANIFEST_PATH, manifest);
  return manifest;
}

async function main() {
  if (clean) cleanGeneratedOutput();
  const catalogEntries = [...catalogPlateEntries(), ...catalogMapEntries()];
  const catalogThumbnails = await resolveCatalogThumbnails(catalogEntries);
  if (CDN_WARMUP_MS) {
    console.log("Waiting " + Math.ceil(CDN_WARMUP_MS / 1000) + "s before CDN downloads.");
    await sleep(CDN_WARMUP_MS);
  }
  const entries = catalogEntries
    .map((entry) => {
      const canonicalFileTitle = commonsFileTitle(entry);
      const fetchUrl = catalogThumbnails.get(fileKey(canonicalFileTitle));
      if (!fetchUrl) {
        throw new Error("No resolved thumbnail URL for " + entry.id + " (" + canonicalFileTitle + ")");
      }
      return {
        ...entry,
        canonicalFileTitle,
        fetchUrl,
      };
    })
    .sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));

  const seenIds = new Set();
  for (const entry of entries) {
    if (seenIds.has(entry.id)) throw new Error("Duplicate local Bible artwork id: " + entry.id);
    seenIds.add(entry.id);
  }

  const groups = new Map();
  for (const entry of entries) {
    const group = groups.get(entry.fetchUrl) ?? [];
    group.push(entry);
    groups.set(entry.fetchUrl, group);
  }
  if (entries.length !== 535 || groups.size !== 532) {
    throw new Error(
      "Unexpected Bible artwork coverage: " + entries.length + " paths / " + groups.size
      + " source derivatives (expected 535 / 532).",
    );
  }

  const previousEntries = loadPreviousEntries();
  const completed = [];
  const failures = [];
  let downloadedGroups = 0;
  let reusedGroups = 0;
  let finishedGroups = 0;

  console.log(
    "Materializing " + entries.length + " Bible artwork/map paths from " + groups.size
    + " unique Wikimedia CDN thumbnails (" + THUMBNAIL_WORKER_COUNT
    + " workers, " + THUMBNAIL_REQUEST_DELAY_MS + "ms shared-host start spacing).",
  );

  const groupList = [...groups.entries()];
  const checkpoint = async () => {
    await writeManifest(
      completed,
      failures,
      groups.size,
      downloadedGroups,
      reusedGroups,
      entries.length,
    );
  };
  const processGroup = async (index, fetchUrl, group) => {
    const label = group.map((entry) => entry.id).join(", ");
    const allCached = !force && group.every((entry) => priorAssetMatches(entry, previousEntries.get(entry.id)));
    if (allCached) {
      for (const entry of group) completed.push(priorManifestEntry(entry, previousEntries.get(entry.id)));
      reusedGroups += 1;
    } else {
      try {
        const source = await downloadSource(fetchUrl);
        const converted = await convertToBoundedWebp(source.data);
        const canonicalId = group[0].id;
        for (const entry of group) {
          const output = outputPathFor(entry);
          mkdirSync(dirname(output.absolute), { recursive: true });
          writeFileSync(output.absolute, converted.data);
          completed.push(manifestEntry(entry, source, converted, entry.id === canonicalId ? null : canonicalId));
        }
        downloadedGroups += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("  FAIL " + label + ": " + message);
        failures.push({
          ids: group.map((entry) => entry.id),
          kind: group[0].kind,
          fetchUrl,
          sourceUrls: group.map((entry) => entry.sourceUrl),
          message,
        });
      }
    }
    finishedGroups += 1;
    await checkpoint();
    if (finishedGroups % 10 === 0 || finishedGroups === groups.size) {
      console.log(
        "  " + finishedGroups + "/" + groups.size + " source groups ("
        + completed.length + " local paths ready)",
      );
    }
  };

  const worker = async (queue, cursor) => {
    while (cursor.value < queue.length) {
      const index = cursor.value;
      cursor.value += 1;
      const [fetchUrl, group] = queue[index];
      await processGroup(index, fetchUrl, group);
    }
  };
  const cursor = { value: 0 };
  const thumbnailWorkers = Array.from(
    { length: THUMBNAIL_WORKER_COUNT },
    () => worker(groupList, cursor),
  );
  await Promise.all(thumbnailWorkers);

  completed.sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));
  const manifest = await writeManifest(completed, failures, groups.size, downloadedGroups, reusedGroups, entries.length);
  const mib = (manifest.summary.totalWebpBytes / (1024 * 1024)).toFixed(2);
  console.log(
    "\nDone: " + manifest.summary.completedEntries + "/" + manifest.summary.mappedEntries
    + " paths, " + manifest.summary.uniqueSourceUrls + " unique sources, "
    + mib + " MiB WebP, " + manifest.summary.failedEntries + " failed.",
  );
  console.log("Manifest: " + relative(ROOT, MANIFEST_PATH));
  if (failures.length) process.exitCode = 1;
}

await main();
