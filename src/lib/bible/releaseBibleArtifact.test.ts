// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporaryRoots: string[] = [];

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), "yourbible-release-artifact-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "dist"), { recursive: true });
  return root;
}

function verify(root: string) {
  return spawnSync(
    process.execPath,
    [resolve(process.cwd(), "scripts", "verify-release-bible-artifact.mjs"), "--repo-root", root],
    { encoding: "utf8" },
  );
}

afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

describe("release Bible artifact verification", () => {
  it("passes when the release contains no bundled Bible files", () => {
    const result = verify(makeRoot());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no full-text Bible bundle");
  });

  it("fails closed when dist contains Bible text without an attestation", () => {
    const root = makeRoot();
    const chapterDirectory = join(root, "dist", "bibles", "csb", "chapters", "Jhn");
    mkdirSync(chapterDirectory, { recursive: true });
    writeFileSync(join(chapterDirectory, "3.json"), JSON.stringify({ verses: [{ text: "test" }] }));

    const result = verify(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("source bundle is not authorized");
  });
});
