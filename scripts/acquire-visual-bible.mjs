/** Explicit acquisition only. Production verifies the committed bundle offline. */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { boundedVisualDerivative } from "./lib/visual-image-derivative.mjs";
import { imageResponseError, imageRetryDelay } from "./lib/image-download-backoff.mjs";
import { readVisualSeed, derivativeSpecs, CANON_CHAPTERS } from "./lib/visual-bible-catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOSTS = new Set(["collectionapi.metmuseum.org", "images.metmuseum.org", "art.thewalters.org", "upload.wikimedia.org", "thumb.wikimedia.org"]);
const MAX_BYTES = 30_000_000;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const licenseUrls = {
  "Public domain": "https://creativecommons.org/publicdomain/mark/1.0/",
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC0 / public domain": "https://creativecommons.org/publicdomain/zero/1.0/",
  ...Object.fromEntries(["by", "by-sa"].flatMap(type => ["2.0", "2.5", "3.0", "4.0"].map(version => [`CC ${type.toUpperCase()} ${version}`, `https://creativecommons.org/licenses/${type}/${version}/`]))),
};
export function assertImageUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !HOSTS.has(url.hostname)) throw new Error(`Unapproved image host: ${url.hostname}`);
  return url.href;
}
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateSeed(assets) {
  if (!Array.isArray(assets) || !assets.length) throw new Error("Empty visual seed");
  const ids = new Set();
  const kinds = new Set(["artwork", "artifact", "map", "place-photo", "architecture", "manuscript", "timeline"]);
  const relationships = new Set(["depiction", "cultural-context", "geography", "reconstruction", "textual-history", "narrative-overview", "thematic"]);
  const collections = new Set(["masterworks", "maps", "artifacts", "heritage", "places"]);
  for (const a of assets) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id ?? "") || ids.has(a.id)) throw new Error(`Invalid or duplicate visual id: ${a.id}`);
    ids.add(a.id);
    if (!Number.isInteger(a.revision) || a.revision < 1 || !kinds.has(a.kind)) throw new Error(`Invalid version/category: ${a.id}`);
    for (const field of ["title", "creator", "date", "culture", "medium", "description", "caution", "alt", "imageUrl"]) {
      if (typeof a[field] !== "string" || !a[field].trim()) throw new Error(`Missing ${field}: ${a.id}`);
    }
    if (!Array.isArray(a.tags) || a.tags.some(tag => typeof tag !== "string")) throw new Error(`Invalid tags: ${a.id}`);
    if (a.collections !== undefined && (!Array.isArray(a.collections) || !a.collections.length || a.collections.some(value => !collections.has(value)))) throw new Error(`Invalid collection: ${a.id}`);
    if (a.readerDerivative !== undefined && typeof a.readerDerivative !== "boolean") throw new Error(`Invalid derivative policy: ${a.id}`);
    if (a.readerRank !== undefined && (!Number.isFinite(a.readerRank) || a.readerRank < 0 || a.readerRank > 100)) throw new Error(`Invalid reader priority: ${a.id}`);
    if (!Array.isArray(a.passages) || !a.passages.length) throw new Error(`Missing passages: ${a.id}`);
    for (const p of a.passages) {
      if (!CANON_CHAPTERS[p.book] || !Number.isInteger(p.chapter) || p.chapter < 1 || p.chapter > CANON_CHAPTERS[p.book] || !relationships.has(p.relationship) || typeof p.note !== "string" || !p.note.trim()) throw new Error(`Invalid passage: ${a.id}`);
      if (p.endChapter !== undefined && (!Number.isInteger(p.endChapter) || p.endChapter < p.chapter || p.endChapter > CANON_CHAPTERS[p.book])) throw new Error(`Invalid chapter range: ${a.id}`);
      if (p.verse !== undefined && (!Number.isInteger(p.verse) || p.verse < 1 || (p.endChapter ?? p.chapter) !== p.chapter)) throw new Error(`Invalid verse: ${a.id}`);
      if (p.endVerse !== undefined && (!p.verse || !Number.isInteger(p.endVerse) || p.endVerse < p.verse)) throw new Error(`Invalid verse range: ${a.id}`);
      if (p.inline !== undefined && typeof p.inline !== "boolean") throw new Error(`Invalid placement approval: ${a.id}`);
    }
    if (!a.source?.credit?.trim() || !a.source.name?.trim() || !a.source.url?.trim()) throw new Error(`Missing provenance: ${a.id}`);
    for (const url of [a.source.objectUrl, a.source.originalImageUrl].filter(Boolean)) {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error(`Invalid provenance URL: ${a.id}`);
    }
    if (a.source.imageSha1 !== undefined && !/^[a-f0-9]{40}$/.test(a.source.imageSha1)) throw new Error(`Invalid source identity: ${a.id}`);
    if (a.imageUrl.startsWith("/")) {
      if (a.review !== "original" || a.source.license !== "YourBible original" || !/^\/visual-bible\/v1\/[a-z0-9-]+\.svg$/.test(a.imageUrl)) throw new Error(`Invalid local original: ${a.id}`);
    } else {
      assertImageUrl(a.imageUrl);
      if (a.review !== "source-checked" || !validDate(a.source.checkedOn) || !licenseUrls[a.source.license] || a.source.licenseUrl !== licenseUrls[a.source.license]) throw new Error(`Unreviewed or unsupported rights: ${a.id}`);
      const url = new URL(a.source.url);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error(`Invalid source URL: ${a.id}`);
    }
  }
}
export async function downloadImage(input, fetcher = fetch) {
  let url = assertImageUrl(input);
  const signal = AbortSignal.timeout(60_000);
  for (let redirect = 0; redirect < 6; redirect++) {
    const response = await fetcher(url, { redirect: "manual", signal, headers: { "User-Agent": "YourBibleVisualLibrary/2.0 (https://github.com/andrew12-circle/yourbible)", Accept: "image/*" } });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without a location");
      url = assertImageUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw imageResponseError(response, url); }
    if (!/^image\/(jpeg|jpg|png|webp|tiff)(;|$)/i.test(response.headers.get("content-type") ?? "")) { await response.body?.cancel(); throw new Error(`Non-raster image response: ${url}`); }
    if (Number(response.headers.get("content-length")) > MAX_BYTES) { await response.body?.cancel(); throw new Error("Source image too large"); }
    if (!response.body) throw new Error("Empty image response");
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error("Source image too large");
        chunks.push(value);
      }
    } catch (error) { await reader.cancel(); throw error; }
    if (!size) throw new Error("Empty image response");
    return { bytes: Buffer.concat(chunks), resolvedUrl: url };
  }
  throw new Error("Too many image redirects");
}
async function writeAtomic(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}
async function verifyEntry(root, asset, entry) {
  if (!entry || entry.recordSha256 !== sha(JSON.stringify(asset)) || JSON.stringify(entry.source) !== JSON.stringify(asset.source)) throw new Error(`Stale manifest: ${asset.id}`);
  const local = asset.imageUrl.startsWith("/");
  const expected = derivativeSpecs(asset).map(spec => spec.path);
  if (!Array.isArray(entry.files) || entry.files.length !== expected.length) throw new Error(`Missing derivatives: ${asset.id}`);
  if (!/^[a-f0-9]{64}$/.test(entry.sourceSha256 ?? "")) throw new Error(`Missing source hash: ${asset.id}`);
  if (!local && entry.originalUrl !== asset.imageUrl) throw new Error(`Wrong image source: ${asset.id}`);
  for (const [index, file] of entry.files.entries()) {
    if (file.path !== expected[index]) throw new Error(`Wrong derivative path: ${asset.id}`);
    const bytes = await readFile(join(root, "public", file.path.slice(1)));
    if (file.sha256 !== sha(bytes) || file.bytes !== bytes.length || !bytes.length) throw new Error(`Image integrity mismatch: ${asset.id}`);
    const metadata = await sharp(bytes, { limitInputPixels: 100_000_000 }).metadata();
    if ((!local && metadata.format !== "webp") || metadata.width !== file.width || metadata.height !== file.height) throw new Error(`Image dimensions/format mismatch: ${asset.id}`);
  }
}
export async function ensureVisualBibleAssets({ root = ROOT, verify = false } = {}) {
  const assets = await readVisualSeed(root);
  validateSeed(assets);
  const manifestPath = join(root, "public/visual-bible/v1/manifest.json");
  let previous;
  try { previous = JSON.parse(await readFile(manifestPath, "utf8")); } catch { previous = { entries: [] }; }
  const entries = [];
  for (const asset of assets) {
    const old = previous.entries?.find(entry => entry.id === asset.id);
    try { await verifyEntry(root, asset, old); entries.push(old); continue; } catch (error) { if (verify) throw error; }
    const record = { id: asset.id, recordSha256: sha(JSON.stringify(asset)), source: asset.source, acquiredAt: new Date().toISOString(), files: [] };
    if (asset.imageUrl.startsWith("/")) {
      const bytes = await readFile(join(root, "public", asset.imageUrl.slice(1)));
      const metadata = await sharp(bytes).metadata();
      record.sourceSha256 = sha(bytes);
      record.files.push({ path: asset.imageUrl, bytes: bytes.length, sha256: sha(bytes), width: metadata.width, height: metadata.height });
    } else {
      let downloaded;
      const cached = join(root, ".visual-bible-cache", `${asset.id}-${asset.revision}.original`);
      for (let attempt = 0; attempt < 5; attempt++) {
        try { downloaded = await downloadImage(asset.imageUrl); break; }
        catch (error) { if (attempt === 4) throw error; const pause = imageRetryDelay(error, attempt); console.warn(`Source paused; waiting ${pause}ms before retrying ${asset.id}`); await new Promise(done => setTimeout(done, pause)); }
      }
      const metadata = await sharp(downloaded.bytes, { limitInputPixels: 100_000_000 }).metadata();
      if (!metadata.width || !metadata.height || Math.max(metadata.width, metadata.height) < (asset.readerDerivative ? 1200 : 400)) throw new Error(`Insufficient image resolution: ${asset.id}`);
      record.sourceSha256 = sha(downloaded.bytes);
      record.sourceBytes = downloaded.bytes.length;
      record.originalUrl = asset.imageUrl;
      record.resolvedUrl = downloaded.resolvedUrl;
      await writeAtomic(cached, downloaded.bytes);
      for (const { path, size, quality } of derivativeSpecs(asset)) {
        const { data, info } = await boundedVisualDerivative(downloaded.bytes, { size, quality });
        if (data.length > 4_900_000) throw new Error(`Derivative exceeds size limit: ${asset.id}`);
        await writeAtomic(join(root, "public", path.slice(1)), data);
        record.files.push({ path, bytes: data.length, sha256: sha(data), width: info.width, height: info.height });
      }
    }
    await verifyEntry(root, asset, record);
    entries.push(record);
    // Save a resumable acquisition checkpoint; verification still requires the full catalog.
    await writeAtomic(manifestPath, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
    if (asset.imageUrl.includes("wikimedia.org")) await new Promise(done => setTimeout(done, 1000));
    console.log(`Acquired ${asset.id}`);
  }
  if (verify && (previous.schemaVersion !== 1 || previous.entries.length !== assets.length)) throw new Error("Unexpected visual manifest entries");
  if (!verify) await writeAtomic(manifestPath, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
  console.log(`Visual library: ${entries.length} assets verified (${entries.reduce((sum, entry) => sum + entry.files.length, 0)} local image files).`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureVisualBibleAssets({ verify: process.argv.includes("--verify") }).catch(error => { console.error(error); process.exitCode = 1; });
}
