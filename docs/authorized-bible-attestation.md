# Authorized Bible attestation

`npm run audit:canonical-bible` checks that the currently bundled reader data is structurally complete. It does **not** prove that the text came from an authorized publisher export or that local/offline distribution is permitted.

`npm run verify:authorized-bible` is the release gate for that second claim. It is deliberately fail-closed: it exits non-zero until a private, completed attestation is supplied. It never calls an external API, reads environment secrets, downloads text, or writes Bible content.

The current `public/bibles/csb` cache is intentionally not certifiable by this command. Its `api-bible-csb-2024` revision is a legacy cache marker, not publisher proof. An authorized re-import needs a fresh reviewed revision and a complete attestation.

## What to obtain

For each shipped full-text edition (CSB and NKJV, if both are enabled), obtain and retain outside Git:

- An authorized, complete publisher or licensed-provider export in a documented format.
- Publisher-issued release evidence that identifies the exact export/revision and its hash, or an equivalent signed provider receipt.
- A written rights grant that explicitly permits full-text distribution and browser/PWA offline storage for the intended family/private deployment scope. Record any device, user, territory, or expiry limits.
- SHA-256 and byte count for each of those three artifacts.

Do not substitute a public quotation policy, a Bible API key, or a self-authored note for a full-text offline distribution grant.

## Private layout

Copy [authorized-bible-attestation.template.json](./templates/authorized-bible-attestation.template.json) to the ignored location below, then fill it only after the materials above have been reviewed:

```text
private/
  authorized-bible/
    attestation.json
    rights/
      csb-offline-license.pdf
      nkjv-offline-license.pdf
    source/
      csb-authorized-export.zip
      nkjv-authorized-export.zip
      csb-publisher-release.pdf
      nkjv-publisher-release.pdf
```

The private directory is intentionally ignored by Git. Keep the agreement and raw exports in the normal secure document store as well; the local copy only lets the release gate verify the exact files used for a build.

## Attestation contract

The top-level document has `schemaVersion: 1`, a non-empty `requiredEditions` list, and one `editions[]` object per required abbreviation.

Each edition needs these groups:

| Group | Required proof |
| --- | --- |
| `edition` | Folder, stable Bible ID, abbreviation, publisher, and **new reviewed** `textRevision`. |
| `rightsGrant` | Issuer, authorization reference, effective/expiry dates, full-text and offline-PWA scopes, and a locally hashed grant document. |
| `sourceExport` | Provider, format/revision, hashed raw package, and independently issued publisher/provider proof. |
| `pipeline` | The deterministic importer name/revision and the same verified raw-package SHA-256. |
| `bundle` | Every shipped JSON chapter and auxiliary JSON file, each with byte and canonical-JSON hashes, plus a whole-bundle digest. |

`canonicalJsonSha256` is the SHA-256 of parsed JSON with object keys recursively sorted and compactly serialized. It preserves every character inside a verse string; it only ignores insignificant JSON whitespace/key order. Keep the regular byte-level `sha256` too. `canonicalBundleSha256` is SHA-256 of sorted lines in this exact form for every listed file:

```text
relative/path.json<NUL>byte-sha256<NUL>canonical-json-sha256<LF>
```

All regular files under `bundle.root` must be attested. A missing, duplicate, changed, malformed, or extra file fails verification. Chapter records must also agree with their path, Bible ID, and text revision.

## Release commands

Validate every enabled bundled edition:

```bash
npm run verify:authorized-bible
```

Require both editions before a CSB + NKJV release:

```bash
npm run verify:authorized-bible -- --edition CSB --edition NKJV
```

Use an attestation stored in a secure location outside the repository if needed:

```bash
npm run verify:authorized-bible -- --attestation D:\secure\yourbible\attestation.json --edition CSB
```

Run this command after the deterministic import and before deployment, alongside lint, tests, build, and the normal production checks. A zero exit code verifies the supplied local evidence and hashes; it does not replace legal review of the underlying agreement or cryptographic verification of a publisher signature where one is available.

