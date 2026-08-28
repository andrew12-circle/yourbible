#!/usr/bin/env node
import { existsSync, rmSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(repositoryRoot, "dist");
const target = resolve(distRoot, "bibles");
const relativeTarget = relative(distRoot, target);

if (relativeTarget !== "bibles") {
  throw new Error(`Refusing to remove unexpected path: ${target}`);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
  console.log("Removed unattested full-text Bible assets from dist/bibles.");
} else {
  console.log("No dist/bibles directory was present.");
}
