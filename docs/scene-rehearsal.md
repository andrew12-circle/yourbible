# Morning Formula: Live the Vision

Step 5 is the Morning Formula's guided visualization. It uses the saved scene
library without rewriting scene text, covers, uploaded audio, or recordings.
A user picks one scene, chooses a 3, 5, 10, or 15 minute practice, and enters the
scene in first person. The protected ACE and House originals remain identifiable
by stable ID/title for preservation checks, but they may be read during this
morning practice because the rehearsal never mutates the source scene.

The cue sequence is designed around one job: see it, hear and feel it, live it,
rehearse the real behavior required, handle one realistic obstacle, practice the
qualities of the person living that life, surrender timing and outcome, and return
to the actual day with one controllable action. Daily practice uses six compact
cues; Deep Vision uses all eleven. Device voice is optional and does not call
ElevenLabs.

Step 6 is deliberately not another scene player. It is the action bridge:
"What does the man you just saw do today?" The action selected in Step 5 is
carried forward automatically, can be refined in Step 6, and is then surfaced
inside Today's Assignment. Existing story notes and existing assignment text are
preserved rather than overwritten.

Practice history is stored under an account-scoped device key and is used only
for deterministic scene suggestions and the optional weekly Deep Vision prompt.
Timers are pacing aids, not delivery deadlines. Hiding the app or starting
competing media pauses/stops playback. No outcome, timing, provision, or divine
instruction is predicted by the visualization.

Structured rehearsal notes remain in the existing visionRecall field in a
delimited block. The Step 6 action uses its own delimited action-bridge block
inside the existing storyRecall field so legacy content survives intact.
The 4,750 character cap still applies to generated rehearsal narration.

Validation is covered by sceneRehearsal.test.ts and
useSceneRehearsalPlayback.test.tsx, including durations, script length,
rotation/history, preservation of source scenes, structured note round-trips,
and the Step 6 action bridge.
