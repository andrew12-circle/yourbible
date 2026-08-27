import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const capacitorCli = resolve(
  repositoryRoot,
  "node_modules/@capacitor/cli/bin/capacitor",
);
const packagePath = resolve(repositoryRoot, "ios/App/CapApp-SPM/Package.swift");

const sync = spawnSync(process.execPath, [capacitorCli, "sync", "ios"], {
  cwd: repositoryRoot,
  env: process.env,
  stdio: "inherit",
});

if (sync.error) throw sync.error;
if (sync.status !== 0) process.exit(sync.status ?? 1);

// Capacitor's Windows sync currently emits backslashes inside Swift string
// literals. Swift treats those as escapes, so normalize only package paths.
const packageSource = readFileSync(packagePath, "utf8");
const normalizedPackage = packageSource.replace(
  /(\.package\(name:\s*"[^"]+",\s*path:\s*")([^"]+)("\))/g,
  (_match, prefix, pluginPath, suffix) =>
    `${prefix}${String(pluginPath).replaceAll("\\", "/")}${suffix}`,
);
if (normalizedPackage !== packageSource) {
  writeFileSync(packagePath, normalizedPackage, "utf8");
  console.log("[sync:ios] Normalized Swift package paths for cross-platform Xcode builds.");
}
