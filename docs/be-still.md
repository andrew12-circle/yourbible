# Be Still listening prayer

Be Still turns the supplied transcript's four movements into a guided practice inside YourBible:

1. Become still, with an optional quiet timer.
2. Bring one question, written or unspoken.
3. Hold the person, situation, or choice gently in mind. Words are also welcome.
4. Release the question and listen without forcing an answer.

A reflection follows the four movements. The user can record what they noticed, choose “Nothing clear today,” note Scripture, write a practical next step, and keep a date for later review. The review date is stored in the entry; it does not schedule a notification. No perceived answer or written reflection is required to finish.

## Entry points

- `/prayer/be-still` is available from the Prayer header, including the default requests ledger.
- Morning Formula's existing “Then listen” section opens `/prayer/be-still?from=morning`.
- Both the main application and mini-phone router load the same page lazily.
- A recovered draft can open at `/prayer/be-still?session=<entry UUID>`.
- The saved session remembers its origin and returns to Prayer or the existing Morning Formula conversation step.

## Quiet timer

The timer offers 2, 5, or 10 minutes and an open-ended option. It starts only when the user chooses to begin, supports pause/resume and hiding the countdown, and uses elapsed timestamps so background tabs do not slow the clock. Sound is off by default. An optional ending tone uses a dedicated audio context and leaves other media alone. Timer completion stays on the quiet screen; the user chooses whether to continue sitting or reflect. Changing prayer stages unmounts and stops the current timer.

## Journal and recovery

The feature reuses `journalDocuments`, the revision-aware save queue, encrypted draft storage, and journal vault gate. It requires no database migration, new service, or model call.

- One session creates one UUID, reused for recovery and every save retry.
- Before creating a local draft, the hook verifies the signed-in account and the selected notebook's encryption policy.
- Draft content stays in the existing IndexedDB journal system. The localStorage pointer contains only a UUID under a user-scoped key.
- Active drafts carry the generic `be-still-draft` tag. General background journal retries skip them and recovery links return to the guided session.
- Selecting “Save my reflection” removes the draft tag and flushes the journal queue. The pointer is cleared only after acknowledgement. Failed saves retain their identity and content.
- The body contains readable Markdown and versioned recovery metadata. Both share the journal's existing text encryption. Tags contain no question or reflection text.
- Saved sessions use ordinary journal rendering (`entry_kind: null`) with `be-still` and `listening-prayer` tags. This avoids the older listening editor's different section format.
- New entries have `analyze_for_mirror: false`; the quiet experience does not ask an AI to interpret, rewrite, or supply an answer.
- The saved entry includes space for a later reflection. Normal journal editing remains available after completion.

## Source and framing

The user supplied the video transcript. Its four-step sequence appears at approximately 4:05–5:56; its later-review discussion appears at 9:40–10:23. The transcript itself acknowledges at 17:17–17:37 that its Nikola Tesla manuscript attribution is uncertain. The feature's About note preserves that distinction and does not present the story as established history.

The UI records the user's own experience. It does not certify an impression's divine origin, promise an answer, or use a feeling of peace or sudden insight as proof. The reflection prompts invite the user to consider Scripture, the character of Jesus, time, and trusted counsel.

## Verification

Focused tests cover the complete stage flow, optional blank reflection, navigation with retained text, draft recovery, verified encryption policy, account changes, deleted entries, repeated starts, stable-ID retry, background retry handling, and timer behavior. Run the repository's required `npm run lint`, `npm run test`, and `npm run build` before release.
