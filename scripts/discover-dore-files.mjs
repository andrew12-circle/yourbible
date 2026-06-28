/** Scan Wikimedia for numbered Doré Bible illustration files (001.–241. and 966.). */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data", "dore-files-discovered.json");

const nums = [];
for (let n = 1; n <= 241; n += 1) nums.push(String(n).padStart(3, "0") + ".");
nums.push("966.");

const files = [];

for (const prefix of nums) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("list", "allimages");
  u.searchParams.set("aiprefix", prefix);
  u.searchParams.set("ailimit", "3");
  u.searchParams.set("format", "json");
  const j = await fetch(u).then((r) => r.json());
  const hit = j.query?.allimages?.find((img) => img.name.startsWith(prefix));
  if (hit) {
    files.push({
      num: prefix.replace(".", ""),
      name: hit.name,
      title: hit.title.replace(/^File:/, ""),
      url: hit.url,
    });
  }
  await new Promise((r) => setTimeout(r, 40));
}

writeFileSync(OUT, JSON.stringify(files, null, 2), "utf8");
console.log(`Found ${files.length} files → ${OUT}`);
