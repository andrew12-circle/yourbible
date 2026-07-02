/** Dump the full sorted "Doré's English Bible" category file list for inspection. */
const API = "https://commons.wikimedia.org/w/api.php";
const CATEGORY = "Category:Doré's English Bible";

async function apiJson(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("format", "json");
  return (await fetch(u)).json();
}

const files = [];
let cont;
do {
  const params = {
    action: "query",
    list: "categorymembers",
    cmtitle: CATEGORY,
    cmtype: "file",
    cmlimit: "500",
  };
  if (cont) params.cmcontinue = cont;
  const r = await apiJson(params);
  for (const m of r.query?.categorymembers ?? []) files.push(m.title.replace(/^File:/, ""));
  cont = r.continue?.cmcontinue;
} while (cont);

const numbered = files.filter((n) => /^\d{3}\./.test(n)).sort();
for (const n of numbered) console.log(n);
console.log(`\n${numbered.length} numbered / ${files.length} total`);
