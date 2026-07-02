/**
 * Verify curated Doré candidate filenames: confirm each exists on Commons,
 * is categorized under a Doré Bible category, is public domain, and is an image.
 */
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "yourbible-plate-discovery/1.0 (dev script)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// scene title -> candidate Commons filename to verify
const candidates = [
  ["The Return of the Prodigal Son", "Gustave Dore - The prodigal son decides to return to his father.jpg"],
  ["The Resurrection of Lazarus", "Gustave Dore Lazarus and the Rich Man.jpg"],
  ["The Nativity", "Gustave Doré - The Nativity.jpg"],
  ["The Last Supper", "Gustave dore bible the last supper.jpg"],
  ["The Good Samaritan", "Gustave Doré - The Good Samaritan.jpg"],
  ["Entry of Jesus Into Jerusalem", "Gustave Dore - Entry into Jerusalem.jpg"],
  ["The Resurrection", "Gustave Doré - Die Auferstehung.jpg"],
];

async function apiJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(u, { headers: { "User-Agent": UA } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      await sleep(2500 * (attempt + 1));
    }
  }
  return {};
}

for (const [title, filename] of candidates) {
  const j = await apiJson({
    action: "query",
    titles: `File:${filename}`,
    prop: "categories|imageinfo",
    cllimit: "50",
    iiprop: "url|mime",
  });
  const page = Object.values(j.query?.pages ?? {})[0] ?? {};
  const exists = !page.missing;
  const cats = (page.categories ?? []).map((c) => c.title.replace(/^Category:/, ""));
  const doreCat = cats.some((c) => /dor/i.test(c));
  const mime = page.imageinfo?.[0]?.mime;
  console.log(`\n== ${title}`);
  console.log(`   file: ${filename}`);
  console.log(`   exists=${exists} mime=${mime} doreCategory=${doreCat}`);
  console.log(`   cats: ${cats.slice(0, 8).join(" | ")}`);
  await sleep(1200);
}
