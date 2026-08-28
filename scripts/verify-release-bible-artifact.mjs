#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyAuthorizedBible } from "./verify-authorized-bible.mjs";

const DEFAULT_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(child));
    else if (entry.isFile() && statSync(child).size > 0) files.push(child);
  }
  return files;
}

export function verifyReleaseBibleArtifact({ repositoryRoot = DEFAULT_REPOSITORY_ROOT } = {}) {
  const resolvedRoot = resolve(repositoryRoot);
  const distRoot = resolve(resolvedRoot, "dist");
  const distBiblesRoot = join(distRoot, "bibles");
  if (!existsSync(distRoot)) {
    return { issues: ["dist does not exist. Run npm run build first."], shippedBibleFiles: [] };
  }
  const shippedBibleFiles = filesBelow(distBiblesRoot);
  if (shippedBibleFiles.length === 0) {
    return { issues: [], shippedBibleFiles, verifiedEditions: [] };
  }
  const result = verifyAuthorizedBible({ repositoryRoot: resolvedRoot });
  const issues = result.issues.length
    ? [
        `dist/bibles contains ${shippedBibleFiles.length} file(s), but the source bundle is not authorized.`,
        ...result.issues,
      ]
    : [];
  return { issues, shippedBibleFiles, verifiedEditions: result.verifiedEditions };
}

function repositoryRootFromArgs(args) {
  const rootFlag = args.indexOf("--repo-root");
  if (rootFlag === -1) return DEFAULT_REPOSITORY_ROOT;
  const value = args[rootFlag + 1];
  if (!value) throw new Error("--repo-root requires a path");
  return value;
}

function main() {
  const result = verifyReleaseBibleArtifact({
    repositoryRoot: repositoryRootFromArgs(process.argv.slice(2)),
  });
  if (result.issues.length) {
    console.error("Release Bible verification failed:");
    for (const issue of result.issues) console.error(`  - ${issue}`);
    process.exitCode = 1;
    return;
  }
  if (result.shippedBibleFiles.length === 0) {
    console.log("Release Bible verification passed: no full-text Bible bundle is present in dist.");
  } else {
    console.log(
      `Release Bible verification passed with attestation for: `
      + result.verifiedEditions.map((edition) => edition.abbreviation).join(", "),
    );
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
