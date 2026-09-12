# Journal completeness and privacy repair — September 12, 2026

## Published core repair

PR #70 was squash merged into main as `0ad7039f62b91d6463d4694d79d2e0b66e93c5b2` at the user's request. Vercel's GitHub status reported success for `yourbible`; the separate `yourbible-vvej` project reported failure. Direct deployment inspection through the current Vercel connection returned 403, so that secondary project and the exact custom-domain binding could not be verified. The updated `journal-sketch-to-text` function was deployed to `itmcsyrnpcnrwviigppe` as ACTIVE version 21 with JWT verification retained.

## This follow-on change

Reader Companion now uses the same durable, revision-aware journal coordinator as the main editors. Its localStorage pointer contains only a user/passage-scoped entry ID, not prose. Failed saves retain edits and do not advance to Dialogue. Existing verse links are preserved; link failures are reported. Private writing is blocked while locked, and AI polish is disabled for encrypted/required-private entries. Legacy unscoped drafts are not automatically attributed to a user and are not deleted.

Map and archive reads use complete ID-cursor pagination, authenticated user filters, decryption-aware loading, and account/vault checks. Locked entries prevent a readable export. Archive filenames include entry IDs, avoiding same-day/title overwrites. Photos, videos, recording transcripts, summaries, and an attachment manifest are included. Download failures abort the export instead of silently omitting files. A user confirmation explains that the resulting ZIP is readable, not password-protected.

The new read-only `journal_entry_list_page` RPC searches full plaintext entry bodies in the database while returning 512-character list previews. Encrypted bodies remain intact during transport for local decryption; encrypted search candidates are filtered on the device after unlock. The function is SECURITY INVOKER, retains journal row-level security, explicitly scopes rows to auth.uid(), and is executable only by authenticated users (not anonymous users). Notebook exclusions preserve entries with no notebook. Sorting has an ID tie-breaker. A shared mobile/desktop loader cancels stale requests and hides old account/vault results immediately. Notes notebook resolution now changes the query scope and triggers a reload.

The RPC migration is additive and does not rewrite journal contents. It was applied before the client depends on it. Metadata checks confirmed security_definer=false, journal RLS=true, anonymous EXECUTE=false, authenticated EXECUTE=true, and zero rows without user context.

Automatic title backfill now skips encrypted/locked entries and applies only confirmed persisted results. Existing-entry title requests send the entry ID, not local plaintext, using the backend's `entry_id` contract.

## Validation

Local focused and complete journal suites passed **368 tests across 66 files**, including actual Reader Companion rendering and shared list-loader race tests (persistence transport is mocked). The development build passed. Full application type diagnostics decreased from 106 at the published core baseline to 104, with no additional diagnostic headers. Full typecheck still fails on the pre-existing repository debt. GitHub Actions reruns these checks on the complete repository and archives their logs; consult the latest run for the exact final head.

## Remaining work and limits

- Physical iPhone, real-camera interruption, real-browser two-device/offline, and low-storage testing have not been performed.
- Archives larger than 256 MB of media currently stop with an explicit error; streaming/split large-video archives remain work. No partial archive is downloaded.
- Transactional photo/media attachment recovery and storage-object cleanup after permanent entry deletion are not implemented by this change.
- Existing application-wide TypeScript errors and dependency audit warnings remain.
- This improves specific privacy bypasses, not a certification of every legacy journal/AI/media route in the app. The broader privacy audit remains necessary.
- Lists use stable ordering with offsets, not a multi-request database snapshot. Concurrent moves/deletes can change pagination; detected duplicate candidates fail with retry rather than silently mixing results.

Do not clear browser storage while pending drafts or recording recovery data remain.
