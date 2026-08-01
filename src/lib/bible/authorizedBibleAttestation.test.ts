import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const verifierPath = resolve(process.cwd(), "scripts/verify-authorized-bible.mjs");
const temporaryRoots: string[] = [];

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }
  return value;
}

function canonicalJsonHash(value: unknown) {
  return sha256(JSON.stringify(sortJson(value)));
}

function writeJson(path: string, value: unknown) {
  const serialized = JSON.stringify(value);
  writeFileSync(path, serialized);
  return {
    sha256: sha256(serialized),
    canonicalJsonSha256: canonicalJsonHash(value),
  };
}

function evidence(path: string, content: string) {
  writeFileSync(path, content);
  return { sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

function bundleHash(entries: Array<{ path: string; sha256: string; canonicalJsonSha256: string }>) {
  return sha256(
    entries
      .slice()
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((entry) => `${entry.path}\u0000${entry.sha256}\u0000${entry.canonicalJsonSha256}\n`)
      .join(""),
  );
}

function createFixture(textRevision = "licensed-test-2026") {
  const root = mkdtempSync(join(tmpdir(), "yourbible-authorized-attestation-"));
  temporaryRoots.push(root);
  const privateRoot = join(root, "private", "authorized-bible");
  const chapterDirectory = join(root, "public", "bibles", "test", "chapters", "Gen");
  mkdirSync(join(privateRoot, "rights"), { recursive: true });
  mkdirSync(join(privateRoot, "source"), { recursive: true });
  mkdirSync(chapterDirectory, { recursive: true });

  const grant = evidence(join(privateRoot, "rights", "grant.txt"), "signed synthetic offline grant");
  const raw = evidence(join(privateRoot, "source", "export.txt"), "authorized synthetic raw export");
  const proof = evidence(join(privateRoot, "source", "publisher-proof.txt"), "synthetic publisher release evidence");

  const bibleId = "licensed-test-bible";
  const chapter = {
    key: `${bibleId}:Gen:1`,
    bibleId,
    bookAbbr: "Gen",
    chapter: 1,
    textRevision,
    verses: [
      {
        verseId: `${bibleId}:Gen:1:1`,
        bibleId,
        bookAbbr: "Gen",
        bookOrder: 0,
        chapter: 1,
        verse: 1,
        text: "Synthetic verification text.",
        textRevision,
      },
    ],
    layout: {},
  };
  const chapterEntry = {
    path: "chapters/Gen/1.json",
    ...writeJson(join(chapterDirectory, "1.json"), chapter),
  };
  const metaEntry = {
    path: "meta.json",
    ...writeJson(join(root, "public", "bibles", "test", "meta.json"), {
      bibleId,
      textRevision,
      chaptersWritten: 1,
    }),
  };
  const searchEntry = {
    path: "search.json",
    ...writeJson(join(root, "public", "bibles", "test", "search.json"), []),
  };

  const manifest = {
    schemaVersion: 1,
    attestationId: "synthetic-test-attestation",
    issuedAt: "2026-08-01T00:00:00Z",
    requiredEditions: ["TST"],
    editions: [
      {
        edition: {
          directory: "test",
          bibleId,
          abbreviation: "TST",
          name: "Synthetic Test Bible",
          publisher: "Synthetic Publisher",
          textRevision,
        },
        rightsGrant: {
          issuer: "Synthetic Publisher",
          reference: "test-license-1",
          effectiveAt: "2026-01-01T00:00:00Z",
          expiresAt: null,
          permittedUses: ["full-text-distribution", "offline-pwa-storage", "family-private-deployment"],
          document: { path: "rights/grant.txt", ...grant },
        },
        sourceExport: {
          provider: "Synthetic Provider",
          format: "json",
          revision: "synthetic-source-r1",
          package: { path: "source/export.txt", ...raw },
          publisherProof: {
            issuer: "Synthetic Publisher",
            reference: "synthetic-release-1",
            document: { path: "source/publisher-proof.txt", ...proof },
          },
        },
        pipeline: {
          importer: "tests/synthetic-importer",
          importerRevision: "git:synthetic",
          sourceSha256: raw.sha256,
        },
        bundle: {
          root: "public/bibles/test",
          generatedFromSourceSha256: raw.sha256,
          chapters: [chapterEntry],
          auxiliaryFiles: [metaEntry, searchEntry],
          canonicalBundleSha256: bundleHash([chapterEntry, metaEntry, searchEntry]),
        },
      },
    ],
  };
  const attestationPath = join(privateRoot, "attestation.json");
  writeJson(attestationPath, manifest);
  return { root, attestationPath, chapterPath: join(chapterDirectory, "1.json") };
}

function runVerifier(root: string, attestationPath: string, ...extraArguments: string[]) {
  return spawnSync(
    process.execPath,
    [verifierPath, "--repo-root", root, "--attestation", attestationPath, ...extraArguments],
    { encoding: "utf8" },
  );
}

afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

describe("authorized Bible attestation verifier", () => {
  it("passes only a complete, internally consistent authorized fixture and rejects a changed chapter", () => {
    const fixture = createFixture();
    const firstRun = runVerifier(fixture.root, fixture.attestationPath);
    expect(firstRun.status).toBe(0);
    expect(firstRun.stdout).toContain("Authorized Bible attestation verified for 1 edition(s): TST.");

    writeFileSync(fixture.chapterPath, JSON.stringify({ changed: "tampered" }));
    const secondRun = runVerifier(fixture.root, fixture.attestationPath);
    expect(secondRun.status).toBe(1);
    expect(secondRun.stderr).toContain("bundle.chapters SHA-256 does not match");
  });

  it("refuses the legacy API.Bible cache marker even with otherwise matching local evidence", () => {
    const fixture = createFixture("api-bible-csb-2024");
    const result = runVerifier(fixture.root, fixture.attestationPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("legacy un-attested API cache marker");
  });

  it("fails closed when a required edition has no attestation entry", () => {
    const fixture = createFixture();
    const result = runVerifier(fixture.root, fixture.attestationPath, "--edition", "NKJV");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("required edition NKJV has no authorized attestation entry");
  });
});
