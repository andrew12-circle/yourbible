# Video journal finalization and queue acceptance

## Reliability contract

- Local queue writes take a short origin-wide metadata lock. Network upload, transcription, and final
  journal merges take an independent user/recording lock. Saving B cannot wait for A's network request.
  Consumers re-read the canonical queue item after claiming it; a completed item is not uploaded again.
- Queue metadata mutations are awaited and serialized. Replaying an enqueue must not erase an existing
  upload or transcript checkpoint or replace an uploaded take with a partial payload.
- A MediaRecorder whose state is `inactive` may still have pending final `dataavailable` and `stop`
  events. A timeout is not completion. Review and normal Save wait for observed final events from the
  video and audio recorders. Late data is included before the result is returned.
- After a delayed finish, the user can download the available part or keep an incomplete recovery only
  after committed recovery segments have been verified. Incomplete recovery is explicitly labeled,
  retained locally, and never automatically treated as a complete uploaded recording. Discard is
  separately confirmed. Cancel invalidates late callbacks from that take.
- Before recording, a bounded storage estimate, persistence-state lookup, and tiny committed IndexedDB
  probe check the device. Available capacity already includes other pending recordings. Estimates are
  approximate, and a successful probe or persistent-storage grant is not a future-space guarantee.
- A failed recording checkpoint is visible while recording, with stop/preserve and backup actions.
  Healthy recording does not display saving/saved chatter.
- Web `Save and return` means durable handoff to automatic upload, not an unapproved draft. Native
  `Keep as draft` retains the AVFoundation source for an explicit review decision.
- Pending recordings is scoped to the signed-in user and vault state and spans all entries on this
  device. It does not imply that browser-local recordings are available on other devices.

## Automated regression coverage

`npm test -- src/lib/journal src/components/journal src/hooks/useJournal` covers queue contention,
repeated consumers, checkpoint retention, bounded storage checks, exceptional recorder notices, and
pending-recording account isolation, alongside existing journal regressions.

`node scripts/test-journal-video-stability.mjs` uses Chromium's real MediaRecorder, Web Locks, and
IndexedDB with synthetic camera/microphone media. It includes delayed and missing final events,
recording-time checkpoint failure, cross-tab local saves during a blocked upload lock, permission
retry, pause/resume, review/backup, mobile-sized rotation, and browser Stop Sharing. Set
`PLAYWRIGHT_MODULE` to an isolated Playwright module as in the video browser CI workflow.

Set `JOURNAL_VIDEO_SOAK_MS=1200000` to extend the initial camera recording to 20 minutes. The ordinary
CI scenarios are short; passing them is not a claim that a full-length recording has been exercised.

## Opt-in real storage and transcription acceptance

`node scripts/test-journal-video-live-storage.mjs` performs network writes and is deliberately **not**
part of uncredentialed CI. Run only against a designated disposable test account and test project,
never a personal journal account. Configure these environment variables without committing secrets:

- `JOURNAL_VIDEO_ACCEPTANCE_CONFIRM=disposable-test-account`
- `JOURNAL_VIDEO_TEST_EMAIL` and `JOURNAL_VIDEO_TEST_PASSWORD`
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the existing anon-key variable)
- `JOURNAL_VIDEO_TEST_FILE`: a playable, intelligible spoken-video fixture above 6 MiB and below the
  application upload cap, at least 20 minutes by default
- `PLAYWRIGHT_MODULE` if Playwright is installed outside this repository

The runner creates a uniquely marked synthetic entry, interrupts a TUS PATCH after a nonzero offset,
reloads, resumes, preserves concurrent writing, requires one attachment and one server transcript,
and verifies playback plus expired-link renewal in a second independent browser context. It cleans
up only the exact owned synthetic entry on success. On failure it retains that test entry for
inspection. Lowering `JOURNAL_VIDEO_MIN_SECONDS` is useful for a smoke test, but is not long-duration
acceptance. A second browser context is **not** a physical second-device test.

A real iPhone still must pass call/background interruption, force-quit, Bluetooth route changes,
low-storage errors, native export, and playback on another physical device. Record the installed
version, browser/OS, fixture duration, and observed results before calling that surface verified.
