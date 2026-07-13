/**
 * Generate children's book page illustrations with OpenAI and save to public/.
 *
 * Usage:
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --from 1 --to 3
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --cover
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCoverIllustrationPrompt, buildPageIllustrationPrompt } from "../src/lib/children-books/illustrationPrompt.ts";
import { findChildrenBook } from "../src/lib/children-books/storybook.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
  const slug = argv[0] ?? "kingdom-invitation";
  let from = 1;
  let to = Number.POSITIVE_INFINITY;
  let force = false;
  let cover = false;
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") force = true;
    if (arg === "--cover") cover = true;
    if (arg === "--from" && argv[i + 1]) from = Number(argv[++i]);
    if (arg === "--to" && argv[i + 1]) to = Number(argv[++i]);
  }
  return { slug, from, to, force, cover };
}

async function generateImageBytes(prompt: string, apiKey: string, model: string): Promise<Uint8Array> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1536",
      quality: process.env.OPENAI_IMAGE_QUALITY ?? "high",
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

async function main() {
  const { slug, from, to, force, cover } = parseArgs(process.argv.slice(2));
  const env = await loadEnvAsync();
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing in .env");

  const model = env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const book = findChildrenBook(slug);
  if (!book) throw new Error(`Unknown book slug: ${slug}`);

  const outDir = path.join(root, "public", "children-books", book.slug);
  await mkdir(outDir, { recursive: true });

  if (cover) {
    const filePath = path.join(outDir, "cover.png");
    if (!force && existsSync(filePath)) {
      console.log(`  [cover] skip (exists) ${book.title}`);
      console.log("Done.");
      return;
    }

    const prompt = buildCoverIllustrationPrompt(book);
    console.log(`Generating cover for ${book.title}…`);
    try {
      const bytes = await generateImageBytes(prompt, apiKey, model);
      await writeFile(filePath, bytes);
      console.log(`  [cover] saved ${path.relative(root, filePath)} (${bytes.length} bytes)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [cover] FAILED ${book.title}: ${message}`);
    }
    console.log("Done.");
    return;
  }

  const lastPage = Math.min(book.pages.length, Number.isFinite(to) ? to : book.pages.length);
  const firstPage = Math.max(1, from);

  console.log(`Generating ${book.title}`);
  console.log(`Pages ${firstPage}-${lastPage} → public/children-books/${book.slug}/`);

  for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
    const page = book.pages[pageNumber - 1];
    if (!page) continue;

    const filePath = path.join(outDir, `${String(pageNumber).padStart(2, "0")}.png`);
    if (!force && existsSync(filePath)) {
      console.log(`  [${pageNumber}] skip (exists) ${page.title}`);
      continue;
    }

    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber });
    console.log(`  [${pageNumber}] generating ${page.title}…`);

    try {
      const bytes = await generateImageBytes(prompt, apiKey, model);
      await writeFile(filePath, bytes);
      console.log(`  [${pageNumber}] saved ${path.relative(root, filePath)} (${bytes.length} bytes)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [${pageNumber}] FAILED ${page.title}: ${message}`);
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
