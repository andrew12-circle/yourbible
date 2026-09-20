/** Build-time acquisition only. No museum requests are made by the Bible reader. */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOSTS = new Set(["collectionapi.metmuseum.org", "images.metmuseum.org", "art.thewalters.org", "upload.wikimedia.org"]);
const MAX_BYTES = 30_000_000;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const licenseUrls = {
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC0 / public domain": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};
export function assertImageUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !HOSTS.has(url.hostname)) throw new Error(`Unapproved image host: ${url.hostname}`);
  return url.href;
}
export function validateSeed(assets) {
  if (!Array.isArray(assets) || !assets.length) throw new Error("Empty visual seed");
  const ids = new Set();
  const kinds = new Set(["artwork", "artifact", "map", "place-photo", "architecture", "manuscript", "timeline"]);
  const relationships = new Set(["depiction", "cultural-context", "geography", "reconstruction", "textual-history", "narrative-overview"]);
  for (const a of assets) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id ?? "") || ids.has(a.id)) throw new Error(`Invalid or duplicate visual id: ${a.id}`);
    ids.add(a.id);
    if (!Number.isInteger(a.revision) || a.revision < 1 || !kinds.has(a.kind)) throw new Error(`Invalid version/category: ${a.id}`);
    for (const field of ["title", "creator", "date", "culture", "medium", "description", "caution", "alt", "imageUrl"]) {
      if (typeof a[field] !== "string" || !a[field].trim()) throw new Error(`Missing ${field}: ${a.id}`);
    }
    if (!Array.isArray(a.tags) || a.tags.some((tag) => typeof tag !== "string")) throw new Error(`Invalid tags: ${a.id}`);
    if (!Array.isArray(a.passages) || !a.passages.length) throw new Error(`Missing passages: ${a.id}`);
    for (const p of a.passages) {
      if (typeof p.book !== "string" || !p.book || !Number.isInteger(p.chapter) || p.chapter < 1 || !relationships.has(p.relationship) || !p.note?.trim()) throw new Error(`Invalid passage: ${a.id}`);
      if (p.endChapter !== undefined && (!Number.isInteger(p.endChapter) || p.endChapter < p.chapter)) throw new Error(`Invalid chapter range: ${a.id}`);
      if (p.verse !== undefined && (!Number.isInteger(p.verse) || p.verse < 1 || (p.endChapter ?? p.chapter) !== p.chapter)) throw new Error(`Invalid verse: ${a.id}`);
      if (p.endVerse !== undefined && (!p.verse || !Number.isInteger(p.endVerse) || p.endVerse < p.verse)) throw new Error(`Invalid verse range: ${a.id}`);
    }
    if (!a.source?.credit?.trim() || !a.source.name?.trim() || !a.source.url?.trim()) throw new Error(`Missing provenance: ${a.id}`);
    if (a.imageUrl.startsWith("/")) {
      if (a.review !== "original" || a.source.license !== "YourBible original" || !/^\/visual-bible\/v1\/[a-z0-9-]+\.svg$/.test(a.imageUrl)) throw new Error(`Invalid local original: ${a.id}`);
    } else {
      assertImageUrl(a.imageUrl);
      if (a.review !== "source-checked" || !/^\d{4}-\d{2}-\d{2}$/.test(a.source.checkedOn ?? "") || !licenseUrls[a.source.license] || a.source.licenseUrl !== licenseUrls[a.source.license]) throw new Error(`Unreviewed or unsupported rights: ${a.id}`);
      if (new URL(a.source.url).protocol !== "https:") throw new Error(`Invalid source URL: ${a.id}`);
    }
  }
}
export async function downloadImage(input, fetcher = fetch) {
  let url = assertImageUrl(input);
  const signal = AbortSignal.timeout(60_000);
  for (let redirect = 0; redirect < 6; redirect++) {
    const response = await fetcher(url, { redirect: "manual", signal, headers: { "User-Agent": "YourBibleVisualLibrary/1.0 (https://github.com/andrew12-circle/yourbible)", Accept: "image/*" } });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without a location");
      url = assertImageUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Image request failed (${response.status}): ${url}`); }
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
  const expected = local ? [asset.imageUrl] : ["thumb", "detail"].map((size) => `/visual-bible/v1/${asset.id}-${asset.revision}-${size}.webp`);
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
  const assets = JSON.parse(await readFile(join(root, "src/data/visualBible/seed.json"), "utf8"));
  validateSeed(assets);
  const manifestPath = join(root, "public/visual-bible/v1/manifest.json");
  let previous;
  try { previous = JSON.parse(await readFile(manifestPath, "utf8")); } catch { previous = { entries: [] }; }
  const entries = [];
  for (const asset of assets) {
    const old = previous.entries?.find((entry) => entry.id === asset.id);
    try { await verifyEntry(root, asset, old); entries.push(old); continue; } catch (error) { if (verify) throw error; }
    const record = { id: asset.id, recordSha256: sha(JSON.stringify(asset)), source: asset.source, acquiredAt: new Date().toISOString(), files: [] };
    if (asset.imageUrl.startsWith("/")) {
      const bytes = await readFile(join(root, "public", asset.imageUrl.slice(1)));
      const metadata = await sharp(bytes).metadata();
      record.sourceSha256 = sha(bytes);
      record.files.push({ path: asset.imageUrl, bytes: bytes.length, sha256: sha(bytes), width: metadata.width, height: metadata.height });
    } else {
      let downloaded;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { downloaded = await downloadImage(asset.imageUrl); break; }
        catch (error) { if (attempt === 2) throw error; await new Promise((done) => setTimeout(done, 2_000 * (attempt + 1))); }
      }
      const metadata = await sharp(downloaded.bytes, { limitInputPixels: 100_000_000 }).metadata();
      if (!metadata.width || !metadata.height || Math.max(metadata.width, metadata.height) < 400) throw new Error(`Insufficient image resolution: ${asset.id}`);
      record.sourceSha256 = sha(downloaded.bytes);
      record.sourceBytes = downloaded.bytes.length;
      record.originalUrl = asset.imageUrl;
      record.resolvedUrl = downloaded.resolvedUrl;
      // Keep downloaded originals outside public/dist; never AI-upscale or crop.
      await writeAtomic(join(root, ".visual-bible-cache", `${asset.id}-${asset.revision}.original`), downloaded.bytes);
      for (const [name, size, quality] of [["thumb", 640, 78], ["detail", 2400, 88]]) {
        const { data, info } = await sharp(downloaded.bytes, { limitInputPixels: 100_000_000 }).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
        if (data.length > 4_900_000) throw new Error(`Derivative exceeds size limit: ${asset.id}`);
        const path = `/visual-bible/v1/${asset.id}-${asset.revision}-${name}.webp`;
        await writeAtomic(join(root, "public", path.slice(1)), data);
        record.files.push({ path, bytes: data.length, sha256: sha(data), width: info.width, height: info.height });
      }
    }
    await verifyEntry(root, asset, record);
    entries.push(record);
  }
  if (verify && (previous.schemaVersion !== 1 || previous.entries.length !== assets.length)) throw new Error("Unexpected visual manifest entries");
  if (!verify) await writeAtomic(manifestPath, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
  console.log(`Visual library: ${entries.length} assets verified (${entries.reduce((sum, entry) => sum + entry.files.length, 0)} local image files).`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureVisualBibleAssets({ verify: process.argv.includes("--verify") }).catch((error) => { console.error(error); process.exitCode = 1; });
}
