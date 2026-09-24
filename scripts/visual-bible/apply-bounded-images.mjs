/** One-time integration, removed with the import workflow after the bundle succeeds. */
import { readFile, writeFile } from 'node:fs/promises';
const path = 'scripts/acquire-visual-bible.mjs';
let text = await readFile(path, 'utf8');
const old = 'await sharp(downloaded.bytes, { limitInputPixels: 100_000_000 }).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true })';
if (!text.includes(old)) throw new Error('Expected derivative encoder missing');
text = text.replace('import sharp from "sharp";', 'import sharp from "sharp";\nimport { boundedVisualDerivative } from "./lib/visual-image-derivative.mjs";');
text = text.replace(old, 'await boundedVisualDerivative(downloaded.bytes, { size, quality })');
await writeFile(path, text);
