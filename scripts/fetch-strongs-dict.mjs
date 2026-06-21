/**
 * Download Open Scriptures Strong's dictionaries into public/strongs/ for offline word study.
 * Source: https://github.com/openscriptures/strongs (public domain / CC-BY-SA)
 */
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "strongs");
const SOURCES = [
  {
    url: "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js",
    out: "hebrew.json",
    varName: "strongsHebrewDictionary",
  },
  {
    url: "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js",
    out: "greek.json",
    varName: "strongsGreekDictionary",
  },
];

function extractJsonObject(jsText, varName) {
  const marker = `var ${varName} = `;
  const start = jsText.indexOf(marker);
  if (start === -1) throw new Error(`Missing ${varName} in source`);
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < jsText.length; i++) {
    const ch = jsText[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return jsText.slice(jsonStart, i + 1);
      }
    }
  }
  throw new Error(`Could not parse JSON for ${varName}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const { url, out, varName } of SOURCES) {
    process.stdout.write(`Fetching ${out}… `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const text = await res.text();
    const jsonText = extractJsonObject(text, varName);
    const parsed = JSON.parse(jsonText);
    const dest = path.join(OUT_DIR, out);
    fs.writeFileSync(dest, JSON.stringify(parsed));
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log(`wrote ${dest} (${kb} KB, ${Object.keys(parsed).length} entries)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
