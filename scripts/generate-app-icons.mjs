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
const iosAssetsDir = path.join(root, "ios", "App", "App", "Assets.xcassets");
const iosAppIcon = path.join(iosAssetsDir, "AppIcon.appiconset", "AppIcon-512@2x.png");
const iosSplashDir = path.join(iosAssetsDir, "Splash.imageset");
const vectorTargets = ["app-icon.svg", "favicon.svg", "icon.svg"];
const nativeSplashTargets = [
  "Default@1x~universal~anyany.png",
  "Default@2x~universal~anyany.png",
  "Default@3x~universal~anyany.png",
  "Default@1x~universal~anyany-dark.png",
  "Default@2x~universal~anyany-dark.png",
  "Default@3x~universal~anyany-dark.png",
];

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

async function renderNativeAssets() {
  // Apple supplies the final icon mask. Crop beyond the rounded source edge so
  // the native bitmap is full bleed and cannot show white corner halos.
  await sharp(sourcePng)
    .extract({ left: 96, top: 96, width: 832, height: 832 })
    .resize(1024, 1024, { fit: "fill" })
    .png()
    .toFile(iosAppIcon);

  const markSize = 720;
  const markMask = Buffer.from(
    `<svg width="${markSize}" height="${markSize}"><circle cx="${markSize / 2}" cy="${markSize / 2}" r="${markSize / 2}" fill="white"/></svg>`,
  );
  const mark = await sharp(sourcePng)
    .extract({ left: 144, top: 144, width: 736, height: 736 })
    .resize(markSize, markSize)
    .ensureAlpha()
    .composite([{ input: markMask, blend: "dest-in" }])
    .png()
    .toBuffer();
  const splash = await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: "#0f172a",
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();

  for (const name of nativeSplashTargets) {
    fs.writeFileSync(path.join(iosSplashDir, name), splash);
  }
  console.log("wrote native iOS app icon and splash assets");
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

  await renderNativeAssets();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
