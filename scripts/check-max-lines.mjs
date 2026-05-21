/** Fail if any src TypeScript file exceeds the line cap. */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const MAX_LINES = 2000;
const ROOT = join(process.cwd(), "src");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith("types.ts")
    ) {
      files.push(path);
    }
  }
  return files;
}

const offenders = [];
for (const file of await walk(ROOT)) {
  const text = await readFile(file, "utf8");
  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > MAX_LINES) {
    offenders.push({ file: relative(process.cwd(), file), lineCount });
  }
}

if (offenders.length) {
  console.error(`Files over ${MAX_LINES} lines:`);
  for (const { file, lineCount } of offenders) {
    console.error(`  ${file}: ${lineCount}`);
  }
  process.exit(1);
}

console.log(`All src/**/*.{ts,tsx} files are at or under ${MAX_LINES} lines.`);
