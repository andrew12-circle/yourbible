#!/usr/bin/env node
/**
 * Fail-closed verification for legally authorized, locally bundled Bible text.
 *
 * This verifier never contacts a Bible API and never reads secrets. It checks a
 * private attestation package containing: (1) the authorized raw export, (2)
 * the publisher/providor evidence and rights grant, and (3) a complete hash
 * manifest for every shipped JSON bundle file. It deliberately rejects an
 * edition when any of those inputs is absent or changed.
 *
 * Usage:
 *   npm run verify:authorized-bible
 *   npm run verify:authorized-bible -- --attestation D:\secure\bible\attestation.json
 *   npm run verify:authorized-bible -- --edition CSB --edition NKJV
 *
 * The default private location is `private/authorized-bible/attestation.json`.
 * That directory is gitignored so licensed source text and agreements cannot be
 * committed accidentally.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPOSITORY_ROOT = resolve(__dirname, "..");
const DEFAULT_ATTESTATION_RELATIVE_PATH = join("private", "authorized-bible", "attestation.json");
const SCHEMA_VERSION = 1;
const REQUIRED_RIGHTS = new Set(["full-text-distribution", "offline-pwa-storage"]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const EDITION_DIRECTORY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
// These are cache labels created before an authorized source package existed.
// A fresh, reviewed import must use a new text revision before it can be attested.
const LEGACY_UNATTESTED_TEXT_REVISIONS = new Set(["api-bible-csb-2024", "api-bible-nkjv-2024"]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEditionCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function isValidDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function displayPath(repositoryRoot, absolutePath) {
  const candidate = relative(repositoryRoot, absolutePath);
  return candidate && !candidate.startsWith("..") && !isAbsolute(candidate) ? candidate : absolutePath;
}

function isInside(root, candidate) {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
}

function resolveInside(root, relativePath, label, issues) {
  if (!nonEmptyString(relativePath)) {
    issues.push(`${label} must be a non-empty relative path`);
    return null;
  }
  if (isAbsolute(relativePath)) {
    issues.push(`${label} must be relative, not absolute`);
    return null;
  }
  const resolved = resolve(root, relativePath);
  if (!isInside(root, resolved)) {
    issues.push(`${label} escapes its permitted directory`);
    return null;
  }
  return resolved;
}

function normalizedRelativePath(value) {
  return value.replaceAll("\\", "/");
}

function safeBundleFilePath(bundleRoot, pathValue, label, issues) {
  const absolutePath = resolveInside(bundleRoot, pathValue, label, issues);
  if (!absolutePath) return null;
  const normalized = normalizedRelativePath(relative(bundleRoot, absolutePath));
  if (!normalized || normalized === ".") {
    issues.push(`${label} must name a file, not the bundle root`);
    return null;
  }
  return { absolutePath, normalized };
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

/** A formatting-independent JSON digest used alongside the byte-level SHA-256. */
export function canonicalJsonSha256(bytes) {
  const parsed = JSON.parse(bytes.toString("utf8"));
  return sha256(Buffer.from(JSON.stringify(sortJson(parsed)), "utf8"));
}

function readJsonFile(filePath, label, issues) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    issues.push(`${label} is not valid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function assertFileHash(filePath, expectedHash, expectedBytes, label, issues) {
  if (!isSha256(expectedHash)) {
    issues.push(`${label} must declare a 64-character SHA-256`);
    return null;
  }
  if (!existsSync(filePath)) {
    issues.push(`${label} is missing (${filePath})`);
    return null;
  }
  let stat;
  try {
    stat = statSync(filePath);
  } catch (error) {
    issues.push(`${label} cannot be read (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
  if (!stat.isFile()) {
    issues.push(`${label} must be a file (${filePath})`);
    return null;
  }
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1) {
    issues.push(`${label} must declare a positive byte count`);
  } else if (stat.size !== expectedBytes) {
    issues.push(`${label} byte count does not match`);
  }
  const actualHash = sha256(readFileSync(filePath));
  if (actualHash !== expectedHash.toLowerCase()) {
    issues.push(`${label} SHA-256 does not match`);
  }
  return actualHash;
}

function collectBundleFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory, { withFileTypes: true })) {
    const childPath = join(directory, name.name);
    const childRelativePath = prefix ? `${prefix}/${name.name}` : name.name;
    if (name.isDirectory()) {
      files.push(...collectBundleFiles(childPath, childRelativePath));
    } else if (name.isFile()) {
      files.push(childRelativePath);
    }
  }
  return files.sort();
}

function requiredObject(parent, key, label, issues) {
  const value = parent?.[key];
  if (!isPlainObject(value)) {
    issues.push(`${label} must be an object`);
    return null;
  }
  return value;
}

function requiredArray(parent, key, label, issues) {
  const value = parent?.[key];
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${label} must be a non-empty array`);
    return null;
  }
  return value;
}

function requiredString(parent, key, label, issues) {
  const value = parent?.[key];
  if (!nonEmptyString(value)) {
    issues.push(`${label} must be a non-empty string`);
    return null;
  }
  return value.trim();
}

function expectedChapterInfo(relativePath) {
  const match = relativePath.match(/^chapters\/([^/]+)\/([1-9]\d*)\.json$/);
  if (!match) return null;
  return { bookAbbr: match[1], chapter: Number(match[2]) };
}

function verifyEvidenceFile(attestationRoot, evidence, label, issues) {
  if (!isPlainObject(evidence)) {
    issues.push(`${label} must be an object`);
    return null;
  }
  const pathValue = requiredString(evidence, "path", `${label}.path`, issues);
  const expectedHash = requiredString(evidence, "sha256", `${label}.sha256`, issues);
  const expectedBytes = evidence.bytes;
  if (!pathValue || !expectedHash) return null;
  const filePath = resolveInside(attestationRoot, pathValue, `${label}.path`, issues);
  if (!filePath) return null;
  return assertFileHash(filePath, expectedHash, expectedBytes, label, issues);
}

function validateRightsGrant(attestationRoot, rightsGrant, issues) {
  if (!isPlainObject(rightsGrant)) {
    issues.push("rightsGrant must be an object");
    return;
  }
  for (const field of ["issuer", "reference"]) {
    requiredString(rightsGrant, field, `rightsGrant.${field}`, issues);
  }
  if (!isValidDate(rightsGrant.effectiveAt)) {
    issues.push("rightsGrant.effectiveAt must be a valid ISO date");
  }
  if (rightsGrant.expiresAt !== null && rightsGrant.expiresAt !== undefined) {
    if (!isValidDate(rightsGrant.expiresAt)) {
      issues.push("rightsGrant.expiresAt must be null or a valid ISO date");
    } else if (Date.parse(rightsGrant.expiresAt) < Date.now()) {
      issues.push("rightsGrant.expiresAt is in the past");
    }
  }

  const permittedUses = requiredArray(rightsGrant, "permittedUses", "rightsGrant.permittedUses", issues);
  if (permittedUses) {
    const uses = new Set(permittedUses.filter((value) => typeof value === "string"));
    for (const requiredUse of REQUIRED_RIGHTS) {
      if (!uses.has(requiredUse)) {
        issues.push(`rightsGrant.permittedUses must include ${requiredUse}`);
      }
    }
  }
  verifyEvidenceFile(attestationRoot, rightsGrant.document, "rightsGrant.document", issues);
}

function validateSourceExport(attestationRoot, sourceExport, issues) {
  if (!isPlainObject(sourceExport)) {
    issues.push("sourceExport must be an object");
    return null;
  }
  for (const field of ["provider", "format", "revision"]) {
    requiredString(sourceExport, field, `sourceExport.${field}`, issues);
  }
  const exportHash = verifyEvidenceFile(attestationRoot, sourceExport.package, "sourceExport.package", issues);
  const publisherProof = sourceExport.publisherProof;
  if (!isPlainObject(publisherProof)) {
    issues.push("sourceExport.publisherProof must be an object with official release evidence");
  } else {
    for (const field of ["issuer", "reference"]) {
      requiredString(publisherProof, field, `sourceExport.publisherProof.${field}`, issues);
    }
    verifyEvidenceFile(attestationRoot, publisherProof.document, "sourceExport.publisherProof.document", issues);
  }
  return exportHash;
}

function validatePipeline(pipeline, sourceHash, issues) {
  if (!isPlainObject(pipeline)) {
    issues.push("pipeline must be an object");
    return;
  }
  for (const field of ["importer", "importerRevision"]) {
    requiredString(pipeline, field, `pipeline.${field}`, issues);
  }
  const pipelineSourceHash = requiredString(pipeline, "sourceSha256", "pipeline.sourceSha256", issues);
  if (sourceHash && pipelineSourceHash && pipelineSourceHash.toLowerCase() !== sourceHash) {
    issues.push("pipeline.sourceSha256 does not match the verified source export");
  }
}

function validateEditionIdentity(edition, issues) {
  if (!isPlainObject(edition)) {
    issues.push("edition must be an object");
    return null;
  }
  const directory = requiredString(edition, "directory", "edition.directory", issues);
  if (directory && !EDITION_DIRECTORY_PATTERN.test(directory)) {
    issues.push("edition.directory must use lowercase letters, digits, and hyphens only");
  }
  const abbreviation = requiredString(edition, "abbreviation", "edition.abbreviation", issues);
  for (const field of ["bibleId", "name", "publisher", "textRevision"]) {
    requiredString(edition, field, `edition.${field}`, issues);
  }
  if (LEGACY_UNATTESTED_TEXT_REVISIONS.has(edition.textRevision)) {
    issues.push(
      `edition.textRevision ${edition.textRevision} is a legacy un-attested API cache marker; `
      + "re-import the authorized export with a new reviewed revision",
    );
  }
  return directory && abbreviation ? { ...edition, directory, abbreviation: normalizeEditionCode(abbreviation) } : null;
}

function validateBundleFileEntry(bundleRoot, entry, kind, edition, issues) {
  if (!isPlainObject(entry)) {
    issues.push(`bundle.${kind} contains a non-object entry`);
    return null;
  }
  const pathValue = requiredString(entry, "path", `bundle.${kind}.path`, issues);
  const declaredByteHash = requiredString(entry, "sha256", `bundle.${kind}.sha256`, issues);
  const declaredCanonicalHash = requiredString(
    entry,
    "canonicalJsonSha256",
    `bundle.${kind}.canonicalJsonSha256`,
    issues,
  );
  if (!pathValue || !declaredByteHash || !declaredCanonicalHash) return null;
  const resolved = safeBundleFilePath(bundleRoot, pathValue, `bundle.${kind}.path`, issues);
  if (!resolved) return null;
  if (!resolved.normalized.endsWith(".json")) {
    issues.push(`bundle.${kind}.path must point to a JSON file`);
    return null;
  }
  if (!existsSync(resolved.absolutePath)) {
    issues.push(`bundle.${kind} file is missing (${resolved.normalized})`);
    return { path: resolved.normalized, sha256: declaredByteHash, canonicalJsonSha256: declaredCanonicalHash };
  }

  const bytes = readFileSync(resolved.absolutePath);
  const actualByteHash = sha256(bytes);
  if (!isSha256(declaredByteHash) || actualByteHash !== declaredByteHash.toLowerCase()) {
    issues.push(`bundle.${kind} SHA-256 does not match (${resolved.normalized})`);
  }

  let parsed;
  let actualCanonicalHash = null;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
    actualCanonicalHash = canonicalJsonSha256(bytes);
  } catch (error) {
    issues.push(
      `bundle.${kind} is not valid JSON (${resolved.normalized}: ${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!isSha256(declaredCanonicalHash) || actualCanonicalHash !== declaredCanonicalHash.toLowerCase()) {
    issues.push(`bundle.${kind} canonical JSON SHA-256 does not match (${resolved.normalized})`);
  }

  if (kind === "chapters" && parsed) {
    const expected = expectedChapterInfo(resolved.normalized);
    if (!expected) {
      issues.push(`bundle.chapters path is not a canonical chapter path (${resolved.normalized})`);
    } else {
      if (parsed.bibleId !== edition.bibleId) {
        issues.push(`bundle chapter bibleId does not match edition (${resolved.normalized})`);
      }
      if (parsed.textRevision !== edition.textRevision) {
        issues.push(`bundle chapter textRevision does not match edition (${resolved.normalized})`);
      }
      if (parsed.bookAbbr !== expected.bookAbbr || parsed.chapter !== expected.chapter) {
        issues.push(`bundle chapter identity does not match its path (${resolved.normalized})`);
      }
      if (!Array.isArray(parsed.verses) || parsed.verses.length === 0) {
        issues.push(`bundle chapter has no verses (${resolved.normalized})`);
      }
    }
  }

  return {
    path: resolved.normalized,
    sha256: actualByteHash,
    canonicalJsonSha256: actualCanonicalHash ?? declaredCanonicalHash,
  };
}

function bundleDigest(entries) {
  const content = entries
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((entry) => `${entry.path}\u0000${entry.sha256}\u0000${entry.canonicalJsonSha256}\n`)
    .join("");
  return sha256(Buffer.from(content, "utf8"));
}

function verifyBundle(repositoryRoot, bundle, identity, sourceHash, issues) {
  if (!isPlainObject(bundle)) {
    issues.push("bundle must be an object");
    return;
  }
  const bundleRootValue = requiredString(bundle, "root", "bundle.root", issues);
  if (!bundleRootValue) return;
  const bundleRoot = resolveInside(repositoryRoot, bundleRootValue, "bundle.root", issues);
  if (!bundleRoot) return;
  const publicBiblesRoot = resolve(repositoryRoot, "public", "bibles");
  if (!isInside(publicBiblesRoot, bundleRoot) || bundleRoot === publicBiblesRoot) {
    issues.push("bundle.root must stay inside public/bibles/<edition-directory>");
    return;
  }
  if (normalizedRelativePath(relative(publicBiblesRoot, bundleRoot)) !== identity.directory) {
    issues.push("bundle.root must equal public/bibles/edition.directory");
  }
  if (!existsSync(bundleRoot) || !statSync(bundleRoot).isDirectory()) {
    issues.push(`bundle.root is missing (${displayPath(repositoryRoot, bundleRoot)})`);
    return;
  }

  const generatedFromSourceHash = requiredString(
    bundle,
    "generatedFromSourceSha256",
    "bundle.generatedFromSourceSha256",
    issues,
  );
  if (sourceHash && generatedFromSourceHash && generatedFromSourceHash.toLowerCase() !== sourceHash) {
    issues.push("bundle.generatedFromSourceSha256 does not match the verified source export");
  }

  const chapters = requiredArray(bundle, "chapters", "bundle.chapters", issues);
  const auxiliaryFiles = requiredArray(bundle, "auxiliaryFiles", "bundle.auxiliaryFiles", issues);
  if (!chapters || !auxiliaryFiles) return;

  const seenPaths = new Set();
  const actualEntries = [];
  for (const entry of chapters) {
    const result = validateBundleFileEntry(bundleRoot, entry, "chapters", identity, issues);
    if (!result) continue;
    if (!result.path.startsWith("chapters/")) {
      issues.push(`bundle.chapters entry must live under chapters/ (${result.path})`);
    }
    if (seenPaths.has(result.path)) issues.push(`bundle lists ${result.path} more than once`);
    seenPaths.add(result.path);
    actualEntries.push(result);
  }
  for (const entry of auxiliaryFiles) {
    const result = validateBundleFileEntry(bundleRoot, entry, "auxiliaryFiles", identity, issues);
    if (!result) continue;
    if (result.path.startsWith("chapters/")) {
      issues.push(`bundle.auxiliaryFiles must not duplicate a chapter (${result.path})`);
    }
    if (seenPaths.has(result.path)) issues.push(`bundle lists ${result.path} more than once`);
    seenPaths.add(result.path);
    actualEntries.push(result);
  }

  if (!seenPaths.has("meta.json")) {
    issues.push("bundle.auxiliaryFiles must include meta.json");
  } else {
    const metaPath = join(bundleRoot, "meta.json");
    const meta = readJsonFile(metaPath, "bundle meta.json", issues);
    if (meta) {
      if (meta.bibleId !== identity.bibleId) issues.push("bundle meta.json bibleId does not match edition");
      if (meta.textRevision !== identity.textRevision) {
        issues.push("bundle meta.json textRevision does not match edition");
      }
    }
  }

  const actualPaths = new Set(collectBundleFiles(bundleRoot));
  for (const pathValue of actualPaths) {
    if (!seenPaths.has(pathValue)) issues.push(`bundle contains an un-attested JSON file (${pathValue})`);
  }
  for (const pathValue of seenPaths) {
    if (!actualPaths.has(pathValue)) issues.push(`bundle manifest lists a missing JSON file (${pathValue})`);
  }

  const declaredBundleHash = requiredString(bundle, "canonicalBundleSha256", "bundle.canonicalBundleSha256", issues);
  const actualBundleHash = bundleDigest(actualEntries);
  if (!isSha256(declaredBundleHash) || actualBundleHash !== declaredBundleHash.toLowerCase()) {
    issues.push("bundle.canonicalBundleSha256 does not match the complete declared bundle");
  }
}

function bundledEditionDirectories(repositoryRoot) {
  const publicBiblesRoot = join(repositoryRoot, "public", "bibles");
  if (!existsSync(publicBiblesRoot)) return [];
  return readdirSync(publicBiblesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(publicBiblesRoot, entry.name, "chapters")))
    .map((entry) => entry.name)
    .sort();
}

function validateAttestation(attestation, repositoryRoot, attestationRoot, requestedEditions) {
  const issues = [];
  if (!isPlainObject(attestation)) {
    return { issues: ["attestation root must be a JSON object"], verifiedEditions: [] };
  }
  if (attestation.schemaVersion !== SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }
  requiredString(attestation, "attestationId", "attestationId", issues);
  if (!isValidDate(attestation.issuedAt)) issues.push("issuedAt must be a valid ISO date");

  const requiredEditions = requiredArray(attestation, "requiredEditions", "requiredEditions", issues);
  const editionEntries = requiredArray(attestation, "editions", "editions", issues);
  if (!editionEntries) return { issues, verifiedEditions: [] };

  const entryByAbbreviation = new Map();
  const entryByDirectory = new Map();
  for (const entry of editionEntries) {
    if (!isPlainObject(entry)) {
      issues.push("editions contains a non-object entry");
      continue;
    }
    const identity = validateEditionIdentity(entry.edition, issues);
    if (!identity) continue;
    if (entryByAbbreviation.has(identity.abbreviation)) {
      issues.push(`editions contains duplicate abbreviation ${identity.abbreviation}`);
      continue;
    }
    if (entryByDirectory.has(identity.directory)) {
      issues.push(`editions contains duplicate directory ${identity.directory}`);
      continue;
    }
    entryByAbbreviation.set(identity.abbreviation, entry);
    entryByDirectory.set(identity.directory, entry);
  }

  const requiredCodes = new Set();
  for (const code of [...(requiredEditions ?? []), ...requestedEditions]) {
    const normalized = normalizeEditionCode(code);
    if (!normalized) {
      issues.push("requiredEditions may contain only non-empty edition abbreviations");
      continue;
    }
    requiredCodes.add(normalized);
  }
  for (const directory of bundledEditionDirectories(repositoryRoot)) {
    const entry = entryByDirectory.get(directory);
    if (!entry) {
      issues.push(`public/bibles/${directory} has no authorized attestation entry`);
      continue;
    }
    const abbreviation = normalizeEditionCode(entry.edition?.abbreviation);
    if (abbreviation) requiredCodes.add(abbreviation);
  }

  for (const code of requiredCodes) {
    if (!entryByAbbreviation.has(code)) {
      issues.push(`required edition ${code} has no authorized attestation entry`);
    }
  }

  const verifiedEditions = [];
  for (const [abbreviation, entry] of entryByAbbreviation) {
    const identity = validateEditionIdentity(entry.edition, issues);
    if (!identity) continue;
    if (!requiredCodes.has(abbreviation)) continue;
    validateRightsGrant(attestationRoot, entry.rightsGrant, issues);
    const sourceHash = validateSourceExport(attestationRoot, entry.sourceExport, issues);
    validatePipeline(entry.pipeline, sourceHash, issues);
    verifyBundle(repositoryRoot, entry.bundle, identity, sourceHash, issues);
    verifiedEditions.push({ abbreviation, directory: identity.directory });
  }

  return { issues, verifiedEditions };
}

export function verifyAuthorizedBible({ repositoryRoot = DEFAULT_REPOSITORY_ROOT, attestationPath, requiredEditions = [] } = {}) {
  const resolvedRepositoryRoot = resolve(repositoryRoot);
  const resolvedAttestationPath = attestationPath
    ? resolve(attestationPath)
    : join(resolvedRepositoryRoot, DEFAULT_ATTESTATION_RELATIVE_PATH);
  const issues = [];

  if (!existsSync(resolvedAttestationPath)) {
    issues.push(
      `Missing authorized Bible attestation: ${displayPath(resolvedRepositoryRoot, resolvedAttestationPath)}. `
      + "This is intentional: an un-attested bundle is not release-certified.",
    );
    return { issues, verifiedEditions: [], attestationPath: resolvedAttestationPath };
  }
  const attestation = readJsonFile(resolvedAttestationPath, "authorized Bible attestation", issues);
  if (!attestation) return { issues, verifiedEditions: [], attestationPath: resolvedAttestationPath };

  const result = validateAttestation(
    attestation,
    resolvedRepositoryRoot,
    dirname(resolvedAttestationPath),
    requiredEditions,
  );
  return { ...result, issues: [...issues, ...result.issues], attestationPath: resolvedAttestationPath };
}

function parseArgs(argv) {
  const options = { repositoryRoot: DEFAULT_REPOSITORY_ROOT, attestationPath: null, requiredEditions: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo-root") {
      const value = argv[++index];
      if (!value) throw new Error("--repo-root requires a path");
      options.repositoryRoot = value;
    } else if (argument === "--attestation") {
      const value = argv[++index];
      if (!value) throw new Error("--attestation requires a path");
      options.attestationPath = value;
    } else if (argument === "--edition") {
      const value = argv[++index];
      if (!value) throw new Error("--edition requires an abbreviation");
      options.requiredEditions.push(value);
    } else if (argument === "--help" || argument === "-h") {
      return { help: true };
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/verify-authorized-bible.mjs [--repo-root PATH] [--attestation PATH] [--edition CSB]");
  console.log("No network or environment secrets are used. Missing evidence fails closed.");
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }

  const result = verifyAuthorizedBible(options);
  if (result.issues.length) {
    console.error(`Authorized Bible attestation verification failed (${result.issues.length} issue(s)):`);
    for (const issue of result.issues) console.error(`  - ${issue}`);
    console.error("\nNo edition has been release-certified by this command.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `Authorized Bible attestation verified for ${result.verifiedEditions.length} edition(s): `
    + result.verifiedEditions.map((edition) => edition.abbreviation).join(", ") + ".",
  );
  console.log(`Attestation: ${displayPath(resolve(options.repositoryRoot), result.attestationPath)}`);
  console.log("Validated local rights/source evidence and the complete deterministic JSON bundle. No network calls were made.");
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
