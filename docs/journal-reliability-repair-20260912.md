# Journal reliability repair — September 12, 2026

## Scope

This change repairs the core desktop/mobile journal save path. It is not certification of the entire app, encryption of every journal surface, or verification on an iPhone.

The two main editors share a document coordinator and serialized save queue. IndexedDB stores user/entry/writer-scoped pending snapshots until the corresponding server save is acknowledged. Explicit saves return success or failure and the saved identity. Failed silent saves remain recoverable. The repository requires the originally observed revision and a returned affected row. Conflicting edits are retained for review, not retried as blind whole-body overwrites. New drafts reserve their identity before asynchronous work, preventing Done and autosave from independently inserting entries.

Video captions are displayed separately from the editable body while recording. Final transcripts merge through the coordinator instead of resetting the editor to its pre-recording body. Pending React updates are tracked so an immediate hide/Done event cannot resubmit the old displayed body. Existing recording checkpoints, upload recovery IDs, and final queue acknowledgement remain in place.

Sketch transcription rejects encrypted entries before sending their images to AI. It appends its immutable result using a fresh revision-checked read, bounded retries, and an idempotent marker. AI-generated metadata is also revision checked and only reported as persisted when a row was updated.

The main entry reading page uses the encryption-aware repository. Already-encrypted entry updates stay encrypted even after notebook or preference changes. Photo attachment row errors now stop completion instead of being ignored. None of these changes deletes or backfills existing journal content.

## Validation

`npm test -- src/lib/journal src/components/journal src/hooks/useJournalComposePersistence.test.tsx` exercises journal regressions, including the actual React compose hook with mocked persistence transport. Queue tests cover failed/overlapping saves and conflict handling; additional tests cover transcript merges, delayed screen updates, and atomic sketch appends. These are not browser/device end-to-end tests.

`npm run build:dev` checks bundling. It is not a production deployment.

`node scripts/check-journal-type-regressions.mjs 540dcad4ba42eea28e8bae655c1a11c8e8dc3419` compares full application TypeScript diagnostics with the audited baseline. It fails on additional diagnostics while reporting the pre-existing type debt separately. A passing comparison does not mean `tsc` is clean. GitHub Actions preserves the full logs and uses pipefail so tee cannot mask a failing command.

## Remaining audit items / release acceptance

- Route remaining raw journal readers/writers (including Reader Companion, map, and export) through the same privacy-aware layer. This PR must not be described as complete end-to-end encryption coverage.
- Complete full-history search, null-notebook filtering, lightweight previews, and consistent pagination.
- Finish transactional media attachment recovery, storage-object cleanup on permanent entry deletion, and complete video-inclusive exports with unique filenames.
- Resolve repository-wide pre-existing TypeScript diagnostics.
- Test the installed iPhone build and browser against interrupted recording, offline save/reload, two tabs/devices, rapid navigation, typing during transcript completion, vault lock/unlock, and storage exhaustion. Confirm the exact deployed commit and edge-function revision before declaring the fix live.

Do not clear a user's browser storage as a troubleshooting step while pending drafts or recording recovery data remain.
