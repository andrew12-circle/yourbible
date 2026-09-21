# Morning Formula flow

## Worship
`MorningWorshipMusic` is rendered in both guided and structured Worship steps. It uses the existing workbook's saved song/playlist and music history, offers Play worship in a separate tab, and lets the user add a share URL and optional name without visiting settings. External playback may require a second Play action in the music app; the app does not promise autoplay or create a provider-owned playlist.

## One journal, video first
Previously, the session used `morning_conversation` and completion created a separate `morning_review` row. Completion now reuses the daily conversation entry and appends a managed summary to it. Record my video journal opens the existing entry with `capture=video`, leaving the actual Record action under user control. Optional writing remains available.

The database RPC `ensure_morning_formula_entry` authenticates the caller, enforces row ownership, and serializes daily creation with an advisory transaction lock. Client calls also coalesce by user/date. Section and summary writes are serialized and revision-checked, preserve unrelated text, custom tags, recording identifiers, and existing links, and retry a concurrent revision conflict. Weather/location enrichment no longer blocks entry creation.

Historical conversation/review pairs are not deleted or automatically consolidated. The September 21 video and separate completion summary were inspected and left intact.

## Bible alongside the session
`MorningScriptureActions` supports a physical Bible, a named resizable Bible window for another display, or reading in the current tab. Pop-out links carry the exact Scripture return route in the URL rather than depending on opener state. A blocked-window fallback offers a normal new-tab link. The reader displays Return to Morning Formula · Scripture. Drafts flush on navigation and page hide.

## Spoken thanksgiving and pacing
Each thanksgiving group has its own speaking control: thanks for now and thanks for what has not yet come. Speak, say "next item" between answers, stop, and select Place into this list. Numbered speech and repeated thanksgiving phrases are also recognized. Organization happens locally without inventing or rewriting gratitude; only empty lines are filled and overflow is retained for review. The speech recognition itself uses the existing browser dictation integration and is not represented as offline recognition. Browser support and microphone permission still apply.

Unplaced recognized speech is cached by user/day/group, including recovery of interim speech. Private-journal encryption disables browser dictation rather than bypassing privacy settings. Typed input remains available. Thanksgiving has a larger suggested share of the session, an Add 5 minutes for thanks action, and a timer that is guidance rather than a compulsory wait or deadline.

## Prayers and stories
Surrender and Covering reuse Lumen's `ChatPrayerBiblePage` with its existing book/page presentation, drop cap, and numbering. They open for reading with Edit prayer as a secondary action and are labeled personal prayer, not Scripture. Story creation also offers a microphone for speaking a new scene; the user chooses what to save.

## Database and verification
Migration `20260921154857_morning_formula_single_journal.sql` adds the missing review notes/journal-link columns and the daily-entry RPC. It was applied to the Bible Project. Authenticated create/reuse, preservation of the first entry body, and review linkage were verified in rolled-back test transactions; no test entries remained.

The application source at `c1027c61fa65b8058bc360c775409aa67da0e39f` passed full lint, 1,897 tests across 375 files, production build, and a no-new-TypeScript-diagnostics comparison with `9ec47d8305da3cb5811fa81f24d1a615039ea315`. The repository has pre-existing type diagnostics; this is a regression check, not a claim of a clean full typecheck. Actual outcomes and the reviewed diff are preserved in GitHub Actions run `35623552936`, artifact `morning-formula-validation`.

Before treating the experience as browser-verified, confirm a successful production deployment and perform a signed-in device test of real microphone permission, external music playback, video recording, and the Bible pop-out/return flow.
