# On Receiving — guided Be Still method

This feature implements the four instructions in the supplied video transcript, not an independently verified Tesla manuscript. The video acknowledges that the proposed source document is unverified. The app does not certify a thought as divine.

## Flow

1. Prepare **before sitting**: Write one question as a single sentence, select the regular place and hour, confirm empty hands, cleared interruptions and putting the day away. All are required before beginning stillness.
2. Stillness: Put the day away. The optional timer can be set to 2, 5 or 10 minutes or open-ended.
3. One question: Recall the single sentence written earlier; return to preparation to amend it.
4. See the question: Picture the person, both roads of a choice, or the specific situation. Written description is optional because this is a mental image.
5. Release it: Stop pushing and wait without forcing. Timer completion does not fabricate an answer.
6. Observe: Record a reasoned thought, a thought that seemed to arrive whole, uncertainty, or nothing clear. For a whole-arriving thought optionally record its completeness, calm, lack of flattery, challenge, and call to action.
7. Review months later: Two ledger columns display arrived-whole versus reasoned thoughts; uncertain or no-result entries remain separately accessible. Mark unreviewed, proved true, did not prove true, or inconclusive. Keep an evidence note. No outcome is determined automatically.

## Routes

- /prayer/be-still is the main guided flow, linked from Prayer.
- /prayer/be-still?from=morning returns to Morning Formula's Then listen section.
- /prayer/be-still/ledger is the ledger, linked from Prayer and from Be Still.

## Storage and privacy

Existing Supabase-backed journal entries are the ledger; there is no new table, migration, dependency, or AI call. Sessions retain the journal's account scoping, encryption policy, recoverable local drafts, stable UUIDs, and revision-aware saving. The browser pointer contains only a user-scoped UUID. A review updates only the versioned metadata marker and the app-owned verification block in the original journal body, preserving unrelated manual notes. Older version-1 drafts still parse. Review dates are recorded, but no reminders are scheduled.

## Verification

Run npm run lint, npm run test and npm run build before release. Test the exact steps, disabled unprepared start, old-draft recovery, the two thought categories, account isolation, locked journal behavior, later review, and failed-save recovery. A signed-in browser smoke test of both preview routes remains necessary.
