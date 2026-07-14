/**
 * Generate children's book illustrations with OpenAI and save to public/.
 *
 * Usage:
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --all --force
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --from 1 --to 3
 *   npx tsx scripts/generate-children-book-illustrations.ts kingdom-invitation --cover
 *   npx tsx scripts/generate-children-book-illustrations.ts --character-sheets --force
 *   npx tsx scripts/generate-children-book-illustrations.ts --all-books --all --force
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCharacterSheetJobs } from "../src/lib/children-books/characterSheets.ts";
import {
  buildClosingIllustrationPrompt,
  buildCoverIllustrationPrompt,
  buildPageIllustrationPrompt,
} from "../src/lib/children-books/illustrationPrompt.ts";
import { CHILDREN_BOOKS, findChildrenBook } from "../src/lib/children-books/storybook.ts";

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
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positionals = argv.filter((a) => !a.startsWith("--"));

  const characterSheets = flags.has("--character-sheets");
  const allBooks = flags.has("--all-books");
  const slug = allBooks || characterSheets ? undefined : (positionals[0] ?? "kingdom-invitation");

  let from = 1;
  let to = Number.POSITIVE_INFINITY;
  let force = flags.has("--force");
  let cover = flags.has("--cover");
  let end = flags.has("--end");
  let all = flags.has("--all");

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--from" && argv[i + 1]) from = Number(argv[++i]);
    if (argv[i] === "--to" && argv[i + 1]) to = Number(argv[++i]);
  }
  if (all) {
    cover = true;
    end = true;
  }
  return { slug, from, to, force, cover, end, all, characterSheets, allBooks };
}

type ImageSize = "1024x1536" | "1536x1024" | "1024x1024";

async function generateImageBytes(
  prompt: string,
  apiKey: string,
  model: string,
  size: ImageSize,
  quality: string,
): Promise<Uint8Array> {
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
    const bytes = await generateImageBytes(prompt, apiKey, model, size, quality);
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
): Promise<number> {
  const jobs = listCharacterSheetJobs();
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

async function generateBook(
  slug: string,
  opts: { from: number; to: number; force: boolean; cover: boolean; end: boolean; all: boolean },
  apiKey: string,
  model: string,
  quality: string,
  delayMs: number,
): Promise<number> {
  const book = findChildrenBook(slug);
  if (!book) throw new Error(`Unknown book slug: ${slug}`);

  const outDir = path.join(root, "public", "children-books", book.slug);
  await mkdir(outDir, { recursive: true });

  let failures = 0;
  const pageSize: ImageSize = "1024x1536";

  if (opts.cover) {
    console.log(`Cover — ${book.title}`);
    const ok = await saveImage(
      "cover",
      path.join(outDir, "cover.png"),
      buildCoverIllustrationPrompt(book),
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

  const lastPage = Math.min(book.pages.length, Number.isFinite(opts.to) ? opts.to : book.pages.length);
  const firstPage = Math.max(1, opts.from);
  const runPages = opts.all || !opts.cover || opts.from <= book.pages.length;

  if (runPages && (opts.all || !opts.cover || firstPage <= lastPage)) {
    console.log(`Pages ${firstPage}-${lastPage} — ${book.title}`);
    console.log(`→ public/children-books/${book.slug}/`);

    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = book.pages[pageNumber - 1];
      if (!page) continue;

      const filePath = path.join(outDir, `${String(pageNumber).padStart(2, "0")}.png`);
      const ok = await saveImage(
        String(pageNumber),
        filePath,
        buildPageIllustrationPrompt({ book, page, pageNumber }),
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
    const ok = await saveImage(
      "end",
      path.join(outDir, "end.png"),
      buildClosingIllustrationPrompt(book),
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnvAsync();
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing in .env");

  const model = env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const quality = env.OPENAI_IMAGE_QUALITY?.trim() || "high";
  const delayMs = Number(env.OPENAI_IMAGE_DELAY_MS ?? 1500);

  let failures = 0;

  if (args.characterSheets || args.allBooks) {
    failures += await generateCharacterSheets(apiKey, model, quality, args.force, delayMs);
  }

  if (args.characterSheets && !args.allBooks) {
    console.log(failures ? `Done with ${failures} failure(s).` : "Done.");
    process.exit(failures > 0 ? 1 : 0);
  }

  const slugs = args.allBooks
    ? CHILDREN_BOOKS.map((b) => b.slug)
    : [args.slug!];

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
