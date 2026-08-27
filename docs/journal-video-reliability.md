# Journal video reliability

This document defines the reliability contract for the journal recorder, its local recovery data,
upload queue, transcription, and mobile presentation.

## Core contract

1. Recording media is checkpointed to IndexedDB in one-second segments while it is being captured.
2. Local metadata never claims a segment until the IndexedDB transaction commits.
3. Pause, background, page freeze, track loss, and Stop request a final recorder segment and wait for
   observed persistence with bounded timeouts.
4. An interruption is not a discard. Only an explicit Cancel or Retake action may delete a recovery
   draft before it has been handed to the durable upload queue.
5. The upload queue is the last local copy. It is removed only after video attachment, transcription
   disposition, and final journal-body merge all succeed.
6. Recovery and retry are scoped to the authenticated user. A same-origin Web Lock, a durable owner
   heartbeat, and an explicit ownership release prevent another tab from claiming a live recorder or
   review draft.
7. Queue consumers share an origin-wide lock. Queue and recovery IDs are reused as storage/database
   idempotency keys, so retrying after a crash does not create another video attachment.
8. Failed upload/transcription work retries while the app remains open with bounded backoff at 30
   seconds, 2 minutes, 5 minutes, then 15 minutes. A completed upload or transcript checkpoint is
   reused instead of repeating earlier network work.
9. If the recorder component unmounts after finalization, its full in-memory Blob is promoted to the
   durable upload queue before ownership is released; partial chunks remain the fallback on failure.

## Lifecycle

```text
preview
  -> recording + recovery lease
  -> paused + durable checkpoint
  -> finalizing + final recorder events + pending IndexedDB writes
  -> ready recovery draft
  -> durable upload queue
  -> video attached
  -> transcription complete or deferred
  -> journal body merged
  -> local queue removed
```

If the browser disappears at any arrow, the last completed durable state is retained. When the app is
visible, online, and authenticated again, current-user recovery resumes from that state.

## Interruption behavior

| Event | Recorder behavior | User-visible recovery |
| --- | --- | --- |
| Manual Pause | Request a segment, pause media and captions, mute the mic | Resume or Save this part |
| Tab/app background | Auto-pause and checkpoint before freeze where the browser permits | Resume if tracks remain live; otherwise Save this part |
| Phone call / media track ends | Latch any final recorder Blob and mark non-resumable | Save this part |
| Browser recorder stops itself | Preserve observed chunks instead of resolving Stop as empty | Save this part |
| Stop pressed repeatedly | Reuse one bounded finalization promise | One review result |
| Offline during save | Keep the queue Blob and metadata | Automatic retry when online/focused, then timed backoff while open |
| Durable queue handoff fails | Keep the captured Blob and review open | Show a retry message; never treat failure as Close |
| Upload succeeds, transcription fails | Keep the queue and stable remote video identity | Video stays safe; transcription retries |
| Journal transcript merge fails | Keep the queue | Retry without falsely reporting full completion |
| Different account signs in | Skip the prior account's local queue/recovery | No cross-account processing |
| PWA update becomes ready | Block refresh while a fresh recorder lease exists | Update waits for save/finish |

## Mobile presentation contract

- iPhone portrait capture requests 9:16 dimensions; landscape requests 16:9.
- Pause/Resume and Stop remain outside horizontally scrolling secondary controls.
- Critical mobile controls are at least 44 CSS pixels.
- Recorder, audio check, and review respect safe-area insets and short-landscape scrolling.
- Review framing follows the recorded media dimensions instead of forcing portrait clips into a
  landscape frame.

## Platform boundary

A web/PWA recorder cannot keep the iPhone camera active while iOS backgrounds the app. The web path
therefore checkpoints and pauses, then validates tracks on return. A true native implementation must
use an iOS project with AVFoundation file-backed recording, interruption notifications, fragment
checkpoints, background/privacy handling, and physical-device call/background testing. The repository
currently contains a future native bridge, but not that iOS implementation.

## Manual device acceptance ledger

Run these on the exact installed iPhone surface before calling a release device-verified:

- Record for 20 seconds, Pause, switch to another Chrome/Safari tab for two minutes, return, Resume,
  Stop, save, and play the complete clip.
- Repeat by backgrounding the app and by accepting/declining a real phone call.
- While paused, verify both Resume and Save this part remain visible in portrait and landscape.
- Force-close after at least two checkpoint segments, reopen, and confirm recovery attaches one video
  with one transcript (no duplicate row).
- Disable connectivity before Stop, close/reopen, restore connectivity, and confirm queued upload.
- Simulate a transcription provider failure after upload; confirm playback remains available and the
  transcript retries without another video attachment.
- Rotate during preview, recording, pause, audio check, and review; verify no capture teardown and no
  clipped action below the home indicator.
- Trigger an available PWA update during recording and confirm Refresh is refused until the recorder is
  durably finished.
