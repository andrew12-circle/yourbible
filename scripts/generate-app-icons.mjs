/**
 * Regenerate PWA / favicon / dock icons from public/app-icon-template.svg.
 * Run: npm run generate:icons
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const templateSvg = path.join(publicDir, "app-icon-template.svg");
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

async function renderPng(size, outPath) {
  await sharp(templateSvg, { density: Math.max(192, size * 2) })
    .resize(size, size)
    .png()
    .toFile(outPath);
}

async function renderIco(outPath) {
  const sizes = [16, 32, 48];
  const pages = await Promise.all(
    sizes.map((size) =>
      sharp(templateSvg, { density: 192 })
        .resize(size, size)
        .png()
        .toBuffer(),
    ),
  );

  // sharp ICO: stack same-size inputs; build multi-page ICO manually via png sizes
  await sharp(pages[2]).toFile(outPath);
}

async function main() {
  if (!fs.existsSync(path.join(publicDir, "app-icon-mark.png"))) {
    throw new Error("Missing public/app-icon-mark.png (inner logo source)");
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
    fs.copyFileSync(templateSvg, path.join(publicDir, name));
    console.log("synced", name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
