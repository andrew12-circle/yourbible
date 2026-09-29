# A connected personal Morning Formula

Adds a saved seasonal theme, motto, daily question and optional personal gratitude/hope prayer to the existing workbook. The opening shows these directly, and a saved theme/motto also appears on the hub. Saved quotes and operating rules are reused rather than duplicated.

## Remember → imagine → act

Gratitude now includes an optional real-memory collection. A memory is created only by the user and explicitly confirmed as a real past event. It can contain text, an approximate date, a private photo, a private recording and a stable saved-scene ID. No testimonies, dates, answered prayers, or personal settings are seeded from examples. Memories and future scenes have separate types and labels.

The user chooses a memory and can deliberately select its paired future scene. Missing/deleted scene links stay recoverable without converting the memory. Existing scene covers, text and narration remain in the existing scene player. A short action field after the scene carries into a blank “The one thing” when continuing. Existing assignments are never replaced; the assignment screen offers an explicit deduplicated append.

## Persistence boundaries

`morning_foundation` and `morning_memories` live in the existing workbook JSON, with backward-compatible defaults. Field-level three-way merges preserve unrelated remote changes and reject conflicting edits. Writes use the existing workbook save path, now serialized and awaitable; navigation/completion flushes pending writes. Failed writes remain pending and surface an error.

The daily `foundation` snapshot travels through the existing owner/date-scoped ritual draft, `connection_notes`, and the existing single compiled journal entry. Snapshot text is not reread from a later edited memory collection. Removing a collection item leaves older snapshots and their media intact. No database migration, new journal entry kind, extra mandatory step, timer extension, paid generation call, or deployment-provider change is introduced.

Media uses unique, owner-prefixed paths in `journal-photos` and `voice-memos`, signed playback, MIME/size validation, and no overwriting of earlier recordings. Recording streams are released when the editor unmounts or a delayed permission request resolves after unmount. New unencrypted memory-media uploads are disabled in encrypted-journal mode. Uploaded media is not automatically transcribed or sent to an AI model. Private bucket access follows existing Supabase policies; tests do not claim live RLS or microphone verification.

Personal foundation editing remains optional. Once an editor is open, the step controls wait for save/cancel, and page-unload gets an unsaved-edit warning. Question edits do not attach a new question to an existing daily answer. Existing surrender and covering prayer texts and recordings are unchanged.

## Verification

`morningFoundation.test.ts` covers migration, malformed/imagined records, unchanged step count, independent/conflicting merges, snapshot preservation, action carryover, draft/connection-note roundtrips and journal compilation. `useLivingHopeWorkbook.test.tsx` covers serialized writes, retry and owner changes. Component tests cover confirmation, failed saves, selection, pairing, removal and non-destructive assignment. Media tests cover type validation, encrypted mode and delayed microphone cleanup.

`node scripts/verify-morning-foundation-ui.mjs` exercises real components with in-memory fixtures at 1440, 820, 390 and 320 pixels, plus dark mode. It verifies overflow, editor controls, memory confirmation, pairing and assignment preservation and captures screenshots. It does not authenticate, write real data or use a real microphone.

The pending Live-the-Vision restructuring in PR #102 is not merged or silently substituted here; the existing guided/structured steps are preserved.
