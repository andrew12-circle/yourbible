/**
 * Validate that every Bible plate / study-map image URL resolves (HTTP 200).
 *
 * Guards against the "Illustration unavailable" regression: if a Doré, Tissot,
 * extra plate, or study-map URL 404s, this exits non-zero so CI catches it.
 *
 * Usage: node scripts/validate-bible-plates.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UA = "yourbible-plate-validation/1.0 (dev script)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pull every `imageUrl: "..."` (or JSON "imageUrl") out of a source file. */
function extractImageUrls(relPath) {
  const text = readFileSync(join(ROOT, relPath), "utf8");
  const urls = [];
  const re = /"imageUrl":\s*"([^"]+)"|imageUrl:\s*`([^`]+)`|imageUrl:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) {
    urls.push(m[1] ?? m[2] ?? m[3]);
  }
  return urls;
}

const sources = [
  "src/data/biblePlates/dorePlates.json",
  "src/data/biblePlates/tissotPlates.ts",
  "src/data/biblePlates/extraPlates.ts",
  "src/lib/bible/studyBackMatter.ts",
];

// Template-literal URLs (Tissot uses a BROOKLYN constant) can't be read as-is;
// resolve the known base so those entries validate too.
const TEMPLATE_BASES = {
  "${BROOKLYN}": "https://d1lfxha3ugu3d4.cloudfront.net/images/opencollection/objects",
};
function resolveTemplate(url) {
  let out = url;
  for (const [token, base] of Object.entries(TEMPLATE_BASES)) {
    out = out.replaceAll(token, base);
  }
  return out;
}

const entries = [];
for (const src of sources) {
  for (const raw of extractImageUrls(src)) {
    entries.push({ src, url: resolveTemplate(raw) });
  }
}

async function check(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": UA },
    });
    if (res.status === 429 && attempt < 5) {
      await sleep(2000 * (attempt + 1));
      return check(url, attempt + 1);
    }
    return res.status;
  } catch {
    if (attempt < 3) {
      await sleep(1000 * (attempt + 1));
      return check(url, attempt + 1);
    }
    return 0;
  }
}

console.log(`Validating ${entries.length} plate/map image URLs...\n`);
const failures = [];
let i = 0;
for (const { src, url } of entries) {
  i += 1;
  const status = await check(url);
  if (status !== 200) {
    failures.push({ src, url, status });
    console.log(`  FAIL [${status}] ${url}`);
  }
  if (i % 20 === 0) console.log(`  ...checked ${i}/${entries.length}`);
  await sleep(300);
}

console.log(`\n${entries.length - failures.length}/${entries.length} URLs OK`);
if (failures.length) {
  console.error(`\n${failures.length} broken image URL(s):`);
  for (const f of failures) console.error(`  [${f.status}] ${f.src}\n        ${f.url}`);
  process.exit(1);
}
console.log("All Bible plate images resolve.");
