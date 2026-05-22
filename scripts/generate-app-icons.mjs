/**
 * Regenerate PWA / favicon / dock icons from public/app-icon-source.png.
 * Run: npm run generate:icons
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const sourcePng = path.join(publicDir, "app-icon-source.png");
const vectorTargets = ["app-icon.svg", "favicon.svg"];

const rasterTargets = [
  { name: "app-icon-512.png", size: 512 },
  { name: "app-icon-192.png", size: 192 },
  { name: "app-icon-180.png", size: 180 },
  { name: "app-icon-32.png", size: 32 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

function pipeline(size) {
  return sharp(sourcePng).resize(size, size, { fit: "cover" });
}

async function renderPng(size, outPath) {
  await pipeline(size).png().toFile(outPath);
}

async function renderIco(outPath) {
  await pipeline(48).png().toFile(outPath);
}

async function writeEmbeddedSvg(outPath) {
  const buf = await pipeline(512).png().toBuffer();
  const b64 = buf.toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" role="img" aria-label="Sacred &amp; Modern">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>`;
  fs.writeFileSync(outPath, svg);
}

async function main() {
  if (!fs.existsSync(sourcePng)) {
    throw new Error("Missing public/app-icon-source.png (master app icon)");
  }

  for (const { name, size } of rasterTargets) {
    const out = path.join(publicDir, name);
    await renderPng(size, out);
    console.log("wrote", name);
  }

  await renderIco(path.join(publicDir, "app-icon.ico"));
  await renderIco(path.join(publicDir, "favicon.ico"));
  console.log("wrote app-icon.ico, favicon.ico");

  for (const name of vectorTargets) {
    await writeEmbeddedSvg(path.join(publicDir, name));
    console.log("wrote", name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
