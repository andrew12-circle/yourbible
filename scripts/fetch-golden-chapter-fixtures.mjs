/**
 * Download API.Bible HTML for golden CSB study chapters (regression fixtures).
 *
 * Usage:
 *   node scripts/fetch-golden-chapter-fixtures.mjs
 *
 * Requires API_BIBLE_KEY in .env (same key as Supabase edge functions).
 * After fetching, run: npm run test:golden:update
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FIXTURE_DIR = path.join(ROOT, "src/lib/bible/fixtures/golden");

const API_BASE = "https://rest.api.bible/v1";

const BOOK_USFM = {
  Gen: "GEN",
  Exo: "EXO",
  Deu: "DEU",
  Psa: "PSA",
  Pro: "PRO",
  Isa: "ISA",
  Mat: "MAT",
  Luk: "LUK",
  Jhn: "JHN",
  Rom: "ROM",
  Gal: "GAL",
  Rev: "REV",
};

const CHAPTERS = [
  { id: "csb-jhn-1", book: "Jhn", chapter: 1 },
  { id: "csb-jhn-5", book: "Jhn", chapter: 5 },
  { id: "csb-psa-23", book: "Psa", chapter: 23 },
  { id: "csb-rom-8", book: "Rom", chapter: 8 },
  { id: "csb-exo-14", book: "Exo", chapter: 14 },
  { id: "csb-gal-5", book: "Gal", chapter: 5 },
  // Expanded high-risk coverage: divine name, poetry/Selah, red-letter,
  // nested quotes, inscriptions, prophetic + wisdom text.
  { id: "csb-gen-1", book: "Gen", chapter: 1 },
  { id: "csb-exo-20", book: "Exo", chapter: 20 },
  { id: "csb-deu-6", book: "Deu", chapter: 6 },
  { id: "csb-psa-22", book: "Psa", chapter: 22 },
  { id: "csb-pro-3", book: "Pro", chapter: 3 },
  { id: "csb-isa-53", book: "Isa", chapter: 53 },
  { id: "csb-mat-5", book: "Mat", chapter: 5 },
  { id: "csb-luk-15", book: "Luk", chapter: 15 },
  { id: "csb-luk-23", book: "Luk", chapter: 23 },
  { id: "csb-rev-21", book: "Rev", chapter: 21 },
];

function loadApiKey() {
  if (process.env.API_BIBLE_KEY) return process.env.API_BIBLE_KEY.trim();
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^API_BIBLE_KEY=(?:"([^"]+)"|(\S+))/);
    if (m) return (m[1] ?? m[2]).trim();
  }
  return null;
}

async function resolveCsbBibleId(apiKey) {
  const preferred = process.env.GOLDEN_CSB_BIBLE_ID?.trim();
  if (preferred) return preferred;

  const r = await fetch(`${API_BASE}/bibles?language=eng`, {
    headers: { "api-key": apiKey },
  });
  if (!r.ok) throw new Error(`bibles list failed: ${r.status}`);
  const json = await r.json();
  const list = json?.data ?? [];
  const csb =
    list.find((b) => b.abbreviation === "CSB" && /study/i.test(b.name ?? "")) ??
    list.find((b) => b.abbreviation === "CSB");
  if (!csb?.id) throw new Error("CSB bible not found in API.Bible catalog");
  console.log(`Using CSB: ${csb.name} (${csb.id})`);
  return csb.id;
}

async function fetchChapterHtml(apiKey, bibleId, book, chapter) {
  const usfm = BOOK_USFM[book];
  if (!usfm) throw new Error(`Unknown book: ${book}`);
  const passageId = `${usfm}.${chapter}`;
  const url =
    `${API_BASE}/bibles/${bibleId}/passages/${passageId}` +
    "?content-type=html&include-notes=true&include-titles=true" +
    "&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false";
  const r = await fetch(url, { headers: { "api-key": apiKey } });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`${passageId} fetch failed: ${r.status} ${err.slice(0, 200)}`);
  }
  const json = await r.json();
  const content = json?.data?.content ?? "";
  if (!content.trim()) throw new Error(`${passageId} returned empty content`);
  return content;
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error("API_BIBLE_KEY missing — set in .env or environment.");
    process.exit(1);
  }

  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const bibleId = await resolveCsbBibleId(apiKey);

  const meta = {
    fetchedAt: new Date().toISOString(),
    bibleId,
    chapters: [],
  };

  for (const spec of CHAPTERS) {
    process.stdout.write(`Fetching ${spec.id}… `);
    const html = await fetchChapterHtml(apiKey, bibleId, spec.book, spec.chapter);
    const outPath = path.join(FIXTURE_DIR, `${spec.id}.html`);
    fs.writeFileSync(outPath, html, "utf8");
    meta.chapters.push({ id: spec.id, bytes: Buffer.byteLength(html, "utf8") });
    console.log(`${(meta.chapters.at(-1).bytes / 1024).toFixed(1)} KB`);
  }

  fs.writeFileSync(path.join(FIXTURE_DIR, "meta.json"), JSON.stringify(meta, null, 2));
  console.log("\nDone. Run: npm run test:golden:update");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
