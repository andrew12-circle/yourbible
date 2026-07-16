/**
 * Generate children's book illustrations with OpenAI and save to public/.
 *
 * Usage:
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --all --force
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --from 1 --to 3
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --cover
 *   npx tsx scripts/generate-children-book-illustrations.ts --character-sheets --force
 *   npx tsx scripts/generate-children-book-illustrations.ts --model-sheets --force
 *   npx tsx scripts/generate-children-book-illustrations.ts --model-sheets --only lilly,winston --force
 *   npx tsx scripts/generate-children-book-illustrations.ts --all-books --all --force
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --all --style-version v2
 *
 * --model-sheets generates the permanent per-character master model sheets
 * (Lilly, Tish, Andrew, Winston) — the "actors" every illustration must match.
 *
 * By default the active Studio Style is used (or a book's pinned studioStyleVersion).
 * Pass --style-version v1|v2 to force a version for this run.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCharacterSheetJobs } from "../src/lib/children-books/characterSheets.ts";
import { listMasterModelSheetJobs } from "../src/lib/children-books/characterModelSheets.ts";
import {
  CHILDREN_BOOKS,
  findChildrenBook,
  type ChildrenBook,
  type ChildrenBookPage,
} from "../src/lib/children-books/storybook.ts";
import {
  buildClosingGenerationRequest,
  buildCoverGenerationRequest,
  buildPageGenerationRequest,
  type StorybookGenerationRequest,
} from "../src/lib/children-books/generationRequest.ts";
import { generationFingerprint } from "../src/lib/children-books/generationFingerprint.ts";
import { STUDIO_STYLE_ANCHOR } from "../src/lib/children-books/characterReferenceAssets.ts";
import {
  ACTIVE_STUDIO_STYLE_VERSION,
  getStudioStyle,
} from "../src/lib/children-books/studioStyles.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function contentTypeForAsset(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

type LoadedReference = { bytes: Uint8Array; contentType: string; name: string };

async function readReferenceBytes(
  refs: StorybookGenerationRequest["referenceImages"],
): Promise<LoadedReference[]> {
  const out: LoadedReference[] = [];
  for (const ref of refs) {
    // The studio anchor falls back to the shared family sheet until a dedicated
    // anchor is approved; every other reference must exist as approved.
    const candidates =
      ref.role === "studio-style" && ref.path !== STUDIO_STYLE_ANCHOR.fallbackPath
        ? [ref.path, STUDIO_STYLE_ANCHOR.fallbackPath]
        : [ref.path];
    const resolvedRel = candidates.find((rel) => existsSync(path.join(root, "public", rel)));
    if (!resolvedRel) {
      throw new Error(`Missing approved reference asset: public/${ref.path}`);
    }
    if (resolvedRel !== ref.path) {
      console.log(`    (studio anchor not approved yet — falling back to ${resolvedRel})`);
    }
    const bytes = new Uint8Array(await readFile(path.join(root, "public", resolvedRel)));
    out.push({
      bytes,
      contentType: contentTypeForAsset(resolvedRel),
      name: path.basename(resolvedRel),
    });
  }
  return out;
}

async function generateImageBytesWithRefs(
  prompt: string,
  refImages: LoadedReference[],
  apiKey: string,
  model: string,
  size: ImageSize,
  quality: string,
): Promise<Uint8Array> {
  if (isGeminiModel(model)) return generateImageBytesGemini(prompt, refImages, apiKey, model, size);
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", quality);
  // These are wholesome faith-based children's illustrations; the default image
  // output moderation produces frequent "other" false positives on multi-child
  // storybook scenes. Relax it so on-model art is not spuriously blocked.
  form.append("moderation", "low");
  for (const img of refImages) {
    form.append("image[]", new Blob([img.bytes], { type: img.contentType }), img.name);
  }
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** True when the chosen image model is a Google Gemini image model. */
function isGeminiModel(model: string): boolean {
  return model.toLowerCase().startsWith("gemini");
}

/** Map our fixed pixel sizes to the aspect ratios Gemini image models accept. */
function sizeToAspectRatio(size: ImageSize): string {
  if (size === "1536x1024") return "3:2";
  if (size === "1024x1024") return "1:1";
  return "2:3"; // 1024x1536 portrait storybook page
}

type GeminiImagePart = {
  inlineData?: { mimeType?: string; data?: string };
  text?: string;
};

/**
 * Generate one image with a Google Gemini image model (e.g. gemini-2.5-flash-image
 * aka "Nano Banana"). Reference images are passed as inline data so the model keeps
 * the studio style + character identity, mirroring the OpenAI images/edits flow.
 * Used as a fallback provider when OpenAI is unavailable (billing/quota) — pass
 * `--model gemini-2.5-flash-image`.
 */
async function generateImageBytesGemini(
  prompt: string,
  refImages: LoadedReference[],
  apiKey: string,
  model: string,
  size: ImageSize,
): Promise<Uint8Array> {
  const parts: GeminiImagePart[] = [{ text: prompt }];
  for (const img of refImages) {
    parts.push({
      inlineData: {
        mimeType: img.contentType,
        data: Buffer.from(img.bytes).toString("base64"),
      },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: sizeToAspectRatio(size) },
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiImagePart[] }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  const outParts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of outParts) {
    const b64 = part.inlineData?.data;
    if (b64) {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bytes.length > 512) return bytes;
    }
  }
  const finish = data.candidates?.[0]?.finishReason;
  const block = data.promptFeedback?.blockReason;
  throw new Error(
    `Gemini returned no image data${finish ? ` (finishReason=${finish})` : ""}${block ? ` (blockReason=${block})` : ""}`,
  );
}

/** gpt-image / Gemini output-stage moderation and 429/5xx/network errors are transient. */
function isRetryableImageError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("moderation_blocked") ||
    m.includes("safety system") ||
    m.includes("no image data") ||
    m.includes("empty image") ||
    m.includes("openai 429") ||
    /openai 5\d\d/.test(m) ||
    m.includes("gemini 429") ||
    /gemini 5\d\d/.test(m) ||
    m.includes("resource_exhausted") ||
    m.includes("unavailable") ||
    m.includes("overloaded") ||
    m.includes("finishreason=image_safety") ||
    m.includes("finishreason=prohibited_content") ||
    m.includes("timeout") ||
    m.includes("network") ||
    m.includes("fetch failed") ||
    m.includes("econnreset")
  );
}

/**
 * Retry a single image generation on transient failures (chiefly gpt-image's
 * probabilistic output-stage moderation "other" false positives on illustrated
 * children/mermaid scenes). Each retry re-runs the same request; because output
 * moderation is stochastic, a re-roll usually passes.
 */
async function withImageRetry(
  label: string,
  attempt: () => Promise<Uint8Array>,
  maxAttempts = 5,
): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let i = 1; i <= maxAttempts; i += 1) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      if (i < maxAttempts && isRetryableImageError(message)) {
        const backoff = 2000 * i;
        console.log(
          `  [${label}] attempt ${i}/${maxAttempts} failed (${message.slice(0, 140)}); retrying in ${backoff}ms…`,
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/** Generate + save one image from a fully-assembled request (with references). */
async function saveFromRequest(
  label: string,
  filePath: string,
  request: StorybookGenerationRequest,
  apiKey: string,
  model: string,
  force: boolean,
  size: ImageSize,
  quality: string,
): Promise<boolean> {
  if (!force && existsSync(filePath)) {
    console.log(`  [${label}] skip (exists)`);
    return true;
  }
  if (!request.validation.ok) {
    console.error(`  [${label}] BLOCKED (pre-generation validation): ${request.validation.errors.join(" ")}`);
    return false;
  }

  console.log(
    `  [${label}] generating with ${request.referenceImages.length} reference image(s)…`,
  );
  try {
    const refImages = await readReferenceBytes(request.referenceImages);
    const bytes = await withImageRetry(label, () =>
      refImages.length
        ? generateImageBytesWithRefs(request.prompt, refImages, apiKey, model, size, quality)
        : generateImageBytes(request.prompt, apiKey, model, size, quality),
    );

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);

    const hash = generationFingerprint({
      bookSlug: request.bookSlug,
      imageKind: request.imageKind,
      pageNumber: request.pageNumber,
      studioStyleVersion: request.versionMetadata.studioStyleVersion,
      worldBibleVersion: request.versionMetadata.worldBibleVersion,
      promptVersion: request.versionMetadata.promptVersion,
      sanitizerVersion: request.versionMetadata.sanitizerVersion,
      characterReferenceVersions: request.versionMetadata.characterReferenceVersions,
      prompt: request.prompt,
      model,
      quality,
      size,
    });
    await writeFile(
      filePath.replace(/\.png$/, ".json"),
      JSON.stringify(
        {
          ...request.versionMetadata,
          bookSlug: request.bookSlug,
          imageKind: request.imageKind,
          pageNumber: request.pageNumber ?? null,
          promptHash: hash,
          model,
          quality,
          size,
          referencePaths: request.referenceImages.map((r) => r.path),
          presentCharacterIds: request.presentCharacterIds,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log(`  [${label}] saved ${path.relative(root, filePath)} (${bytes.length} bytes)`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [${label}] FAILED: ${message}`);
    return false;
  }
}

async function loadEnvAsync(): Promise<Record<string, string>> {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return {};
  const raw = await readFile(envPath, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--") && !a.includes("=")));
  const positionals = argv.filter((a) => !a.startsWith("--"));

  const characterSheets = flags.has("--character-sheets");
  const modelSheets = flags.has("--model-sheets");
  const styleAnchor = flags.has("--style-anchor");
  const allBooks = flags.has("--all-books");
  const acceptance = flags.has("--acceptance");
  const slug =
    allBooks || characterSheets || modelSheets || styleAnchor || acceptance
      ? undefined
      : (positionals[0] ?? "kingdom-invitation");

  let from = 1;
  let to = Number.POSITIVE_INFINITY;
  let force = flags.has("--force");
  let cover = flags.has("--cover");
  let end = flags.has("--end");
  let all = flags.has("--all");
  let onlySheets: string[] = [];
  let styleVersion: string | undefined;
  let model: string | undefined;
  let pages: number[] | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--from" && argv[i + 1]) from = Number(argv[++i]);
    if (argv[i] === "--to" && argv[i + 1]) to = Number(argv[++i]);
    if (argv[i] === "--only" && argv[i + 1]) {
      onlySheets = argv[++i]!.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (argv[i] === "--style-version" && argv[i + 1]) styleVersion = argv[++i];
    if (argv[i] === "--model" && argv[i + 1]) model = argv[++i];
    // Explicit non-contiguous page list, e.g. --pages 2,4,5,19,25 — regenerate
    // only these pages and leave every other already-good page untouched.
    if (argv[i] === "--pages" && argv[i + 1]) {
      pages = argv[++i]!
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
  }
  if (all) {
    cover = true;
    end = true;
  }
  return { slug, from, to, force, cover, end, all, characterSheets, modelSheets, styleAnchor, allBooks, acceptance, onlySheets, styleVersion, model, pages };
}

type ImageSize = "1024x1536" | "1536x1024" | "1024x1024";

async function generateImageBytes(
  prompt: string,
  apiKey: string,
  model: string,
  size: ImageSize,
  quality: string,
): Promise<Uint8Array> {
  if (isGeminiModel(model)) return generateImageBytesGemini(prompt, [], apiKey, model, size);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      moderation: "low",
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }

  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");

  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function saveImage(
  label: string,
  filePath: string,
  prompt: string,
  apiKey: string,
  model: string,
  force: boolean,
  size: ImageSize,
  quality: string,
): Promise<boolean> {
  if (!force && existsSync(filePath)) {
    console.log(`  [${label}] skip (exists)`);
    return true;
  }

  console.log(`  [${label}] generating…`);
  try {
    const bytes = await withImageRetry(label, () =>
      generateImageBytes(prompt, apiKey, model, size, quality),
    );
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    console.log(`  [${label}] saved ${path.relative(root, filePath)} (${bytes.length} bytes)`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [${label}] FAILED: ${message}`);
    return false;
  }
}

async function generateCharacterSheets(
  apiKey: string,
  model: string,
  quality: string,
  force: boolean,
  delayMs: number,
  onlySheets: string[] = [],
  styleVersion?: string,
): Promise<number> {
  let jobs = listCharacterSheetJobs(undefined, styleVersion);
  if (onlySheets.length > 0) {
    const wanted = new Set(onlySheets.map((s) => s.toLowerCase()));
    jobs = jobs.filter((job) => wanted.has(`${job.characterId}/${job.kind}`.toLowerCase()));
    if (jobs.length === 0) {
      throw new Error(`No character sheets matched --only ${onlySheets.join(",")}`);
    }
  }
  console.log(`Character bible sheets — ${jobs.length} plate(s)`);
  let failures = 0;

  for (const job of jobs) {
    const filePath = path.join(root, "public", job.relativePath);
    const ok = await saveImage(
      `${job.characterId}/${job.kind}`,
      filePath,
      job.prompt,
      apiKey,
      model,
      force,
      job.size,
      quality,
    );
    if (!ok) failures += 1;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return failures;
}

/**
 * Generate the dedicated studio-style anchor — a PURE-STYLE exemplar that
 * demonstrates studioStyle_v3 (bright, airy, clean 2D-animation linework) with a
 * generic, non-specific figure. It is sent first on every page so the whole
 * library keeps one consistent look. Approve this once, then regenerate books.
 */
async function generateStyleAnchor(
  apiKey: string,
  model: string,
  quality: string,
  force: boolean,
  styleVersion?: string,
): Promise<number> {
  const style = getStudioStyle(styleVersion ?? ACTIVE_STUDIO_STYLE_VERSION);
  const prompt = [
    style.masterPrompt,
    "",
    "PURPOSE: This image is the permanent STUDIO STYLE ANCHOR — a single representative sample that defines the illustration language for the whole library. It is a style reference only.",
    "",
    style.studioStyle,
    "",
    "SCENE (generic style demonstration — do NOT depict any specific named character)",
    "One gentle, generic storybook child and a small friendly dog standing in a bright meadow under a clear pale-blue sky, a soft simplified tree line behind them. Calm, joyful, everyday moment. This is a neutral exemplar of the studio look, not a story page.",
    "",
    "COMPOSITION",
    "Single clear subject, eye-level, strong readable silhouette, generous pale open space. No text, labels, turnaround views, or palette strip.",
    "",
    "PALETTE",
    "Bright, clean, high-key palette — porcelain white, pale sky blue, sea-glass green, blush accents. Truly white whites, cool-neutral shadows. No amber, orange, sepia, or golden wash.",
    "",
    "EXCLUSIONS / NEGATIVE PROMPT",
    style.negativePrompt,
  ].join("\n");

  const filePath = path.join(root, "public", STUDIO_STYLE_ANCHOR.path);
  console.log(`Studio style anchor (${style.version}) → public/${STUDIO_STYLE_ANCHOR.path}`);
  const ok = await saveImage(
    "studio-anchor",
    filePath,
    prompt,
    apiKey,
    model,
    force,
    "1024x1536",
    quality,
  );
  return ok ? 0 : 1;
}

async function generateModelSheets(
  apiKey: string,
  model: string,
  quality: string,
  force: boolean,
  delayMs: number,
  onlyIds: string[] = [],
  styleVersion?: string,
): Promise<number> {
  let jobs = listMasterModelSheetJobs(undefined, styleVersion);
  if (onlyIds.length > 0) {
    const wanted = new Set(onlyIds.map((s) => s.toLowerCase()));
    jobs = jobs.filter((job) => wanted.has(job.characterId.toLowerCase()));
    if (jobs.length === 0) {
      throw new Error(`No character model sheets matched --only ${onlyIds.join(",")}`);
    }
  }
  console.log(`Character model sheets — ${jobs.length} sheet(s)`);
  let failures = 0;

  for (const job of jobs) {
    const filePath = path.join(root, "public", job.relativePath);
    const ok = await saveImage(
      `${job.characterId}/model-sheet`,
      filePath,
      job.prompt,
      apiKey,
      model,
      force,
      job.size,
      quality,
    );
    if (!ok) failures += 1;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return failures;
}

async function generateBook(
  slug: string,
  opts: { from: number; to: number; force: boolean; cover: boolean; end: boolean; all: boolean; styleVersion?: string; pages?: number[] },
  apiKey: string,
  model: string,
  quality: string,
  delayMs: number,
): Promise<number> {
  const found = findChildrenBook(slug);
  if (!found) throw new Error(`Unknown book slug: ${slug}`);
  const book: ChildrenBook = opts.styleVersion
    ? { ...found, studioStyleVersion: opts.styleVersion as ChildrenBook["studioStyleVersion"] }
    : found;

  const outDir = path.join(root, "public", "children-books", book.slug);
  await mkdir(outDir, { recursive: true });

  let failures = 0;
  const pageSize: ImageSize = "1024x1536";

  if (opts.cover) {
    console.log(`Cover — ${book.title}`);
    const ok = await saveFromRequest(
      "cover",
      path.join(outDir, "cover.png"),
      buildCoverGenerationRequest(book),
      apiKey,
      model,
      opts.force,
      pageSize,
      quality,
    );
    if (!ok) failures += 1;
    if (!opts.all && !opts.end && opts.from > book.pages.length) {
      return failures;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  const explicitPages =
    opts.pages && opts.pages.length > 0
      ? [...new Set(opts.pages)].filter((n) => n >= 1 && n <= book.pages.length).sort((a, b) => a - b)
      : null;

  const lastPage = Math.min(book.pages.length, Number.isFinite(opts.to) ? opts.to : book.pages.length);
  const firstPage = Math.max(1, opts.from);

  const pageNumbers: number[] = explicitPages
    ? explicitPages
    : opts.all || !opts.cover || firstPage <= lastPage
      ? Array.from({ length: Math.max(0, lastPage - firstPage + 1) }, (_, i) => firstPage + i)
      : [];

  if (pageNumbers.length > 0) {
    console.log(
      explicitPages
        ? `Pages ${explicitPages.join(", ")} — ${book.title}`
        : `Pages ${firstPage}-${lastPage} — ${book.title}`,
    );
    console.log(`→ public/children-books/${book.slug}/`);

    for (const pageNumber of pageNumbers) {
      const page = book.pages[pageNumber - 1];
      if (!page) continue;

      const filePath = path.join(outDir, `${String(pageNumber).padStart(2, "0")}.png`);
      const ok = await saveFromRequest(
        String(pageNumber),
        filePath,
        buildPageGenerationRequest(book, page, pageNumber),
        apiKey,
        model,
        opts.force,
        pageSize,
        quality,
      );
      if (!ok) failures += 1;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (opts.end) {
    console.log(`Closing spread — ${book.title}`);
    const ok = await saveFromRequest(
      "end",
      path.join(outDir, "end.png"),
      buildClosingGenerationRequest(book),
      apiKey,
      model,
      opts.force,
      pageSize,
      quality,
    );
    if (!ok) failures += 1;
  }

  return failures;
}

/**
 * Controlled acceptance tests (Section 18). Run these THREE scenes before any
 * full-library regeneration:
 *   A — Lilly portrait   B — family kitchen   C — underwater Lilly + Liora
 * Output: public/children-books/_acceptance/{a,b,c}.png (+ .json fingerprint).
 */
function acceptanceBook(overrides: Partial<ChildrenBook>): ChildrenBook {
  return {
    slug: "_acceptance",
    title: "Acceptance Test",
    heroName: "Lilly",
    characterId: "lilly",
    worldId: "european-kingdom",
    sourceNote: "Controlled acceptance test",
    ageRange: "Ages 4-8",
    spiritualFocus: "Studio consistency check",
    summary: "Controlled acceptance test scene.",
    coverGradient: "linear-gradient(135deg,#e0f2fe,#ffffff)",
    coverPrompt: "n/a",
    generationSeed: "n/a",
    closingPrayer: "n/a",
    closingIllustrationPrompt: "n/a",
    pages: [],
    ...overrides,
  };
}

function acceptancePage(overrides: Partial<ChildrenBookPage>): ChildrenBookPage {
  return {
    title: "Acceptance",
    body: "",
    scriptureThread: "Studio consistency check.",
    picturePrompt: "",
    palette: "home-daylight",
    symbol: "heart",
    ...overrides,
  };
}

async function generateAcceptanceTests(
  apiKey: string,
  model: string,
  quality: string,
  force: boolean,
  delayMs: number,
): Promise<number> {
  const outDir = path.join(root, "public", "children-books", "_acceptance");
  await mkdir(outDir, { recursive: true });
  const size: ImageSize = "1024x1536";

  const bookB = acceptanceBook({ worldId: "kitchen-coral-reef", castIds: ["tish", "andrew", "winston"] });
  const bookC = acceptanceBook({ worldId: "coastal-kingdom" });

  const cases: Array<{ label: string; request: StorybookGenerationRequest }> = [
    {
      label: "A-lilly-portrait",
      request: buildPageGenerationRequest(
        acceptanceBook({}),
        acceptancePage({
          presentCharacterIds: ["lilly"],
          picturePrompt:
            "Lilly, age five, standing in bright neutral daylight in a simple white-and-pale-blue dress, natural gentle smile, approved short curls and bow, plain pale background.",
        }),
        1,
      ),
    },
    {
      label: "B-family-kitchen",
      request: buildPageGenerationRequest(
        bookB,
        acceptancePage({
          presentCharacterIds: ["lilly", "tish", "andrew", "winston"],
          picturePrompt:
            "Lilly seated at a pale breakfast table. Tish cooking pancakes at the stove. Andrew pouring orange juice. Winston beside Lilly. Bright open-window daylight. White and pale-blue kitchen. Simple composition with ample pale negative space.",
        }),
        1,
      ),
    },
    {
      label: "C-underwater-lilly-liora",
      request: buildPageGenerationRequest(
        bookC,
        acceptancePage({
          palette: "coastal",
          presentCharacterIds: ["lilly", "liora"],
          picturePrompt:
            "Lilly and Liora together underwater. Lilly retains her short curls and wears an aqua dress (no mermaid tail). Liora retains her own distinct approved face and long auburn hair. Clean turquoise water, simple coral framing limited to the edges, a large open water area, and one turtle in the distance.",
        }),
        1,
      ),
    },
  ];

  let failures = 0;
  console.log(`Acceptance tests — ${cases.length} controlled scene(s)`);
  for (const c of cases) {
    const ok = await saveFromRequest(
      c.label,
      path.join(outDir, `${c.label}.png`),
      c.request,
      apiKey,
      model,
      force,
      size,
      quality,
    );
    if (!ok) failures += 1;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnvAsync();

  const model = args.model?.trim() || env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const apiKey = isGeminiModel(model) ? env.GEMINI_API_KEY?.trim() : env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      isGeminiModel(model) ? "GEMINI_API_KEY missing in .env" : "OPENAI_API_KEY missing in .env",
    );
  }
  console.log(`Image provider: ${isGeminiModel(model) ? "gemini" : "openai"} (${model})`);

  const quality = env.OPENAI_IMAGE_QUALITY?.trim() || "high";
  const delayMs = Number(env.OPENAI_IMAGE_DELAY_MS ?? 1500);

  let failures = 0;

  if (args.styleAnchor) {
    failures += await generateStyleAnchor(apiKey, model, quality, args.force, args.styleVersion);
    console.log(failures ? `Done with ${failures} failure(s).` : "Done.");
    process.exit(failures > 0 ? 1 : 0);
  }

  if (args.acceptance) {
    failures += await generateAcceptanceTests(apiKey, model, quality, args.force, delayMs);
    console.log(failures ? `Done with ${failures} failure(s).` : "Done.");
    process.exit(failures > 0 ? 1 : 0);
  }

  if (args.characterSheets) {
    failures += await generateCharacterSheets(
      apiKey,
      model,
      quality,
      args.force,
      delayMs,
      args.onlySheets,
      args.styleVersion,
    );
  }

  if (args.modelSheets) {
    failures += await generateModelSheets(
      apiKey,
      model,
      quality,
      args.force,
      delayMs,
      args.onlySheets,
      args.styleVersion,
    );
  }

  if ((args.characterSheets || args.modelSheets) && !args.allBooks) {
    console.log(failures ? `Done with ${failures} failure(s).` : "Done.");
    process.exit(failures > 0 ? 1 : 0);
  }

  if (!args.characterSheets && !args.modelSheets && !args.allBooks && !args.acceptance && !args.slug) {
    throw new Error(
      "Provide a book slug, --acceptance, --character-sheets, --model-sheets, or --all-books",
    );
  }

  const slugs = args.allBooks
    ? CHILDREN_BOOKS.map((b) => b.slug)
    : args.slug
      ? [args.slug]
      : [];

  for (const slug of slugs) {
    console.log(`\n=== ${slug} ===`);
    failures += await generateBook(
      slug,
      {
        from: args.from,
        to: args.to,
        force: args.force,
        cover: args.cover || args.allBooks,
        end: args.end || args.allBooks,
        all: args.all || args.allBooks,
        styleVersion: args.styleVersion,
        pages: args.pages,
      },
      apiKey,
      model,
      quality,
      delayMs,
    );
  }

  console.log(failures ? `\nDone with ${failures} failure(s).` : "\nDone.");
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
