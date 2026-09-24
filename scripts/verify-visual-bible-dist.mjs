/** Validate the actual deployed files, not just a successful JavaScript build. */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateSeed } from "./acquire-visual-bible.mjs";
import { readVisualSeed, derivativeSpecs } from "./lib/visual-bible-catalog.mjs";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha = data => createHash("sha256").update(data).digest("hex");
export async function verifyVisualBibleDist({ root = ROOT, outDir = "dist" } = {}) {
  const assets = await readVisualSeed(root);
  validateSeed(assets);
  const target = resolve(root, outDir);
  const manifest = JSON.parse(await readFile(join(target, "visual-bible/v1/manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries) || manifest.entries.length !== assets.length) throw new Error("Release visual manifest is missing or incomplete");
  const entries = new Map(manifest.entries.map(entry => [entry.id, entry]));
  if (entries.size !== assets.length) throw new Error("Release visual manifest has duplicate records");
  let count = 0;
  for (const asset of assets) {
    const entry = entries.get(asset.id);
    if (!entry || entry.recordSha256 !== sha(JSON.stringify(asset))) throw new Error(`Release visual metadata mismatch: ${asset.id}`);
    const expected = derivativeSpecs(asset).map(spec => spec.path);
    if (!Array.isArray(entry.files) || entry.files.length !== expected.length) throw new Error(`Missing release derivatives: ${asset.id}`);
    for (const [index, path] of expected.entries()) {
      const file = entry.files[index];
      if (file.path !== path) throw new Error(`Unexpected release path: ${asset.id}`);
      const bytes = await readFile(join(target, path.slice(1)));
      if (!bytes.length || bytes.length !== file.bytes || sha(bytes) !== file.sha256) throw new Error(`Release image missing or corrupt: ${path}`);
      const metadata = await sharp(bytes, { limitInputPixels: 100_000_000 }).metadata();
      if (metadata.width !== file.width || metadata.height !== file.height || (path.endsWith(".webp") && metadata.format !== "webp")) throw new Error(`Release image format mismatch: ${path}`);
      count++;
    }
  }
  console.log(`Release visual files verified: ${assets.length} records, ${count} real images in ${target}.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyVisualBibleDist().catch(error => { console.error(error); process.exitCode = 1; });
}
