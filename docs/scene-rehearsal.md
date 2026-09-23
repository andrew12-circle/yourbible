# Guided scene rehearsal

Embodied Vision provides an optional paced practice. Play a Scene keeps the full
story library and the existing uploaded recordings. The gallery, ACE defaults,
ACE local-storage key, covers, and uploaded audio are not rewritten by this feature.
The two protected originals are excluded by title and stable ID from all generated
practice variants. Generic engine code contains no personal scene narratives.

Daily practice offers 3 or 5 minute targets and six combined cues. Deep Vision
provides 10 or 15 minute targets and all eleven cues. Process, recovery, and
perspective emphases rotate by local calendar date. Suggestions use the chosen
focus and completed practice history stored under an account-scoped device key.
This is deterministic selection, not AI assessment. Weekly Deep Vision is an
in-app suggestion, not a scheduled notification.

Timers are practice pacing, never delivery deadlines. Device voice is opt-in,
uses no ElevenLabs endpoint, and can extend a target rather than cutting a cue
short. Hiding the app, starting another media recording, and unmounting stop or
pause the guide. Cues can be skipped. Emotion need not be forced; words or sound
can substitute for clear mental images. Surrender is followed by one controllable
action and an optional if-then plan. No manifestation, prediction, diagnosis, or
automatic claim of divine direction is made.

Notes are added to the existing visionRecall field in one delimited block.
Unrelated reflections are preserved. Today's Assignment offers a user-confirmed
append, never an overwrite of an existing assignment. Completion is explicit.
The 4,750 character cap applies to generated practice scripts and the targeted
new scene edits; the protected original scripts are not trimmed to enforce it.

Personal script revisions are made separately in a row-locked transaction with
per-scene preflight hashes, a private owner-readable recovery table, length checks,
unchanged scene counts/order, and an equality assertion for every untargeted scene.
No private scripts belong in this public repository or in migrations.

Validation: sceneRehearsal.test.ts covers protection, durations, script lengths,
rotation, history, note preservation and actions. useSceneRehearsalPlayback.test.tsx
covers opt-in playback, background pausing, competing audio, navigation and cleanup.
