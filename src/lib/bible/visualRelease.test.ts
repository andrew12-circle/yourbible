// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { verifyVisualBibleDist } from "../../../scripts/verify-visual-bible-dist.mjs";
import source from "@/data/visualBible/seed.json";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "visual-release-")); roots.push(root);
  await mkdir(join(root, "src/data/visualBible"), { recursive: true });
  await mkdir(join(root, "dist/visual-bible/v1"), { recursive: true });
  const asset = source[0];
  await writeFile(join(root, "src/data/visualBible/seed.json"), JSON.stringify([asset]));
  await writeFile(join(root, "src/data/visualBible/readerExpansion.json"), "[]");
  const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: {r:0,g:0,b:0} } }).webp().toBuffer();
  const files = ["thumb", "detail"].map((size) => ({ path: `/visual-bible/v1/${asset.id}-${asset.revision}-${size}.webp`, bytes: bytes.length, sha256: hash(bytes), width: 16, height: 16 }));
  for (const file of files) await writeFile(join(root, "dist", file.path.slice(1)), bytes);
  await writeFile(join(root, "dist/visual-bible/v1/manifest.json"), JSON.stringify({schemaVersion:1,entries:[{id:asset.id,recordSha256:hash(JSON.stringify(asset)),files}]}));
  return {root,files};
}
describe("production visual release", () => {
  it("verifies the actual output files, not only the source public directory", async () => {
    const {root} = await fixture();
    await expect(verifyVisualBibleDist({root})).resolves.toBeUndefined();
  });
  it("rejects an HTML fallback masquerading as a successful image", async () => {
    const {root,files} = await fixture();
    await writeFile(join(root,"dist",files[0].path.slice(1)),"<!doctype html><html>App fallback</html>");
    await expect(verifyVisualBibleDist({root})).rejects.toThrow(/corrupt/);
  });
  it("rejects a missing acquired image", async () => {
    const {root,files} = await fixture();
    await rm(join(root,"dist",files[1].path.slice(1)));
    await expect(verifyVisualBibleDist({root})).rejects.toThrow();
  });
  it("keeps visual URLs out of the SPA rewrite and acquisition enabled on Vercel", async () => {
    const config = JSON.parse(await readFile("vercel.json","utf8"));
    const spa = new RegExp(`^${config.rewrites[0].source}$`);
    expect(spa.test("/read/Luk/1")).toBe(true);
    for (const path of ["/visual-bible/v1/manifest.json","/visual-bible/v1/met-459016-1-detail.webp","/bible-plates/maps/exodus.webp"]) expect(spa.test(path)).toBe(false);
    const vite = await readFile("vite.config.ts","utf8");
    expect(vite).not.toMatch(/!process\.env\.VERCEL\s*&&\s*visualBibleAssetsPlugin/);
  });
});
