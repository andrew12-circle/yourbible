import type { JournalVideoCaptureResult } from "@/lib/journal/journalVideoCaptureLifecycle";
import { supabase } from "@/integrations/supabase/client";
import {
  applyVideoChaptersToTranscript,
  type JournalVideoChapter,
} from "@/lib/journal/journalVideoChapters";
import {
  bodySnapFromMeta,
  persistVideoJournalTranscriptToEntry,
} from "@/lib/journal/journalVideoEntryMerge";
import {
  pickBestVideoJournalTranscript,
  prepareVideoJournalTranscript,
  type VideoJournalBodySnap,
} from "@/lib/journal/journalVideoBody";
import { clearInProgressJournalVideoRecording } from "@/lib/journal/journalVideoRecordingRecovery";
import {
  enqueueJournalVideoUpload,
  listQueuedJournalVideoUploads,
  readQueuedJournalVideoUpload,
  removeQueuedJournalVideoUpload,
  updateQueuedJournalVideoUpload,
  withJournalVideoUploadQueueWaitingLock,
  type QueuedJournalVideoUpload,
} from "@/lib/journal/journalVideoUploadQueue";
import {
  insertEntryVideo,
  transcribeJournalVideo,
  updateEntryVideoTranscript,
  uploadEntryVideo,
} from "@/lib/journal/videos";

export type ProcessJournalVideoUploadResult = {
  /** Backward-compatible alias for completed queue items. */
  processed: number;
  failed: number;
  uploaded: number;
  completed: number;
  /** Unique entries whose queue items fully completed in this processing pass. */
  completedEntryIds: string[];
  deferredTranscription: number;
  skipped: number;
};

export type JournalVideoSaveStatus =
  | "completed"
  | "deferred-transcription"
  | "deferred-retry";

export type SaveJournalVideoCaptureResult = {
  transcript: string;
  anchorOffset: number;
  sttError: string | null;
  liveTranscript: string;
  peakLiveTranscript: string;
  status: JournalVideoSaveStatus;
  uploaded: boolean;
  storagePath: string | null;
  videoId: string | null;
};

export type JournalVideoCaptureSaveInput = {
  userId: string;
  entryId: string;
  result: JournalVideoCaptureResult;
  durationMs: number;
  anchorOffset: number;
  bodySnap?: VideoJournalBodySnap | null;
};

export type JournalVideoCaptureSaveOutcome = {
  saved: SaveJournalVideoCaptureResult;
  queued: boolean;
};

type QueuedJournalVideoFinalizationCheckpoint = QueuedJournalVideoUpload & {
  transcriptionCompleted?: boolean;
  finalTranscript?: string;
};

function queueMetaFromInput(
  queueId: string,
  input: JournalVideoCaptureSaveInput,
  recordedMs: number,
): QueuedJournalVideoUpload {
  const { userId, entryId, result, anchorOffset, bodySnap } = input;
  return {
    id: queueId,
    userId,
    entryId,
    anchorOffset,
    durationMs: recordedMs,
    liveTranscript: result.liveTranscript,
    peakLiveTranscript: result.peakLiveTranscript,
    bodySnapBody: bodySnap?.body,
    bodySnapAnchor: bodySnap?.anchor,
    createdAt: new Date().toISOString(),
    stage: "queued",
    attemptCount: 0,
    transcriptionAttemptCount: 0,
  };
}

async function mergeTranscriptIntoEntry(
  userId: string,
  entryId: string,
  anchorOffset: number,
  transcript: string,
  bodySnap: VideoJournalBodySnap | null,
): Promise<void> {
  if (!transcript.trim()) return;
  await persistVideoJournalTranscriptToEntry(userId, entryId, transcript, anchorOffset, bodySnap);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const TERMINAL_SHORT_RECORDING_MS = 5_000;

/** Silence/very-short recordings cannot improve with retries; provider/network failures can. */
export function isTerminalJournalVideoTranscriptionError(
  error: string | null | undefined,
  durationMs: number,
): boolean {
  const message = error?.trim() ?? "";
  if (!message) return false;
  if (/too short|record a little longer/i.test(message)) {
    return durationMs <= TERMINAL_SHORT_RECORDING_MS;
  }
  return (
    /empty transcript/i.test(message) ||
    /nothing to transcribe/i.test(message) ||
    /couldn.?t detect speech/i.test(message) ||
    /no (?:usable )?(?:speech|voice|words)(?: was| were)? (?:detected|found|captured)/i.test(message) ||
    /no audio (?:track )?(?:was )?captured/i.test(message) ||
    /speech (?:was )?not detected/i.test(message)
  );
}

function serverTranscriptionSucceeded(source: string | null | undefined): boolean {
  return source === "audio-sidecar" || source === "storage-video";
}

function journalVideoTranscriptionNeedsRetry(
  stt: {
    source?: string | null;
    error?: string | null;
    serverTranscriptSucceeded?: boolean;
    disposition?: "complete" | "retryable-error" | "terminal-no-speech";
  },
  durationMs: number,
): boolean {
  if (stt.disposition) return stt.disposition === "retryable-error";
  if (stt.serverTranscriptSucceeded === true) return false;
  return (
    Boolean(stt.error) &&
    !serverTranscriptionSucceeded(stt.source) &&
    !isTerminalJournalVideoTranscriptionError(stt.error, durationMs)
  );
}

function emptyProcessResult(): ProcessJournalVideoUploadResult {
  return {
    processed: 0,
    failed: 0,
    uploaded: 0,
    completed: 0,
    completedEntryIds: [],
    deferredTranscription: 0,
    skipped: 0,
  };
}

async function currentQueueUserId(explicitUserId?: string | null): Promise<string | null> {
  if (explicitUserId?.trim()) return explicitUserId;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[journal-video-queue] could not read current session:", error);
      return null;
    }
    return data.session?.user.id ?? null;
  } catch (error) {
    console.warn("[journal-video-queue] could not read current session:", error);
    return null;
  }
}

export async function processJournalVideoUploadQueue(
  userId?: string | null,
): Promise<ProcessJournalVideoUploadResult> {
  const result = emptyProcessResult();
  const allQueued = listQueuedJournalVideoUploads();
  const scopedUserId = await currentQueueUserId(userId);
  if (!scopedUserId) {
    result.skipped = allQueued.length;
    return result;
  }

  const queue = listQueuedJournalVideoUploads(scopedUserId);
  result.skipped = Math.max(0, allQueued.length - queue.length);
  let processed = 0;

  for (const meta of queue) {
    try {
      const saved = await uploadQueuedJournalVideo(meta);
      result.uploaded += saved.uploaded ? 1 : 0;
      if (saved.status === "deferred-transcription") {
        result.deferredTranscription += 1;
      } else {
        processed += 1;
        result.completed += 1;
        if (!result.completedEntryIds.includes(meta.entryId)) {
          result.completedEntryIds.push(meta.entryId);
        }
      }
    } catch (e) {
      console.warn("[journal-video-queue] retry failed:", e);
      result.failed += 1;
      try {
        updateQueuedJournalVideoUpload(meta.id, {
          stage: "failed",
          lastError: errorMessage(e),
          lastAttemptAt: new Date().toISOString(),
        });
      } catch (metadataError) {
        console.warn("[journal-video-queue] could not save retry state:", metadataError);
      }
    }
  }

  result.processed = processed;
  return result;
}

export async function uploadQueuedJournalVideo(
  meta: QueuedJournalVideoUpload,
): Promise<SaveJournalVideoCaptureResult> {
  const durableMeta = meta as QueuedJournalVideoFinalizationCheckpoint;
  const snap = bodySnapFromMeta(meta.bodySnapBody, meta.bodySnapAnchor);
  const liveCaptions = pickBestVideoJournalTranscript(meta.liveTranscript, meta.peakLiveTranscript);
  const checkpoint =
    meta.storagePath && meta.videoId
      ? { storagePath: meta.storagePath, videoId: meta.videoId }
      : undefined;
  const hasFinalizationCheckpoint = Boolean(
    checkpoint && durableMeta.transcriptionCompleted === true,
  );
  const attemptAt = new Date().toISOString();
  updateQueuedJournalVideoUpload(meta.id, {
    stage: hasFinalizationCheckpoint ? "merging-final-transcript" : "merging-live-transcript",
    attemptCount: (meta.attemptCount ?? 0) + 1,
    lastAttemptAt: attemptAt,
    lastError: undefined,
  });

  let saved: SaveJournalVideoCaptureResult;
  if (hasFinalizationCheckpoint && checkpoint) {
    saved = {
      transcript: durableMeta.finalTranscript ?? "",
      anchorOffset: meta.anchorOffset,
      sttError: null,
      liveTranscript: meta.liveTranscript,
      peakLiveTranscript: liveCaptions,
      status: "completed",
      uploaded: true,
      storagePath: checkpoint.storagePath,
      videoId: checkpoint.videoId,
    };
  } else {
    const payload = await readQueuedJournalVideoUpload(meta.id);
    if (!payload) {
      updateQueuedJournalVideoUpload(meta.id, {
        stage: "failed",
        lastError: "Queued video data is missing",
        lastAttemptAt: new Date().toISOString(),
      });
      throw new Error("Queued video data is missing");
    }

    // Commit the transcript before the (larger, failure-prone) video upload so
    // a persistently failing upload can never strand the user's words.
    await mergeTranscriptIntoEntry(meta.userId, meta.entryId, meta.anchorOffset, liveCaptions, snap);
    const markTranscribing = ({ storagePath, videoId }: { storagePath: string; videoId: string }) => {
      updateQueuedJournalVideoUpload(meta.id, {
        stage: "transcribing",
        transcriptionAttemptCount: (meta.transcriptionAttemptCount ?? 0) + 1,
        uploadedAt: meta.uploadedAt ?? new Date().toISOString(),
        storagePath,
        videoId,
      });
    };
    if (checkpoint) markTranscribing(checkpoint);
    else updateQueuedJournalVideoUpload(meta.id, { stage: "uploading" });

    saved = await saveJournalVideoCapture(
      meta.userId,
      meta.entryId,
      payload.video,
      payload.audio,
      meta.durationMs,
      meta.anchorOffset,
      meta.liveTranscript,
      payload.chapters,
      meta.peakLiveTranscript ?? "",
      meta.id,
      markTranscribing,
      checkpoint,
    );
  }

  if (saved.status === "deferred-transcription") {
    updateQueuedJournalVideoUpload(meta.id, {
      stage: "deferred-transcription",
      lastError: saved.sttError ?? "Transcription is waiting to retry.",
      storagePath: saved.storagePath ?? undefined,
      videoId: saved.videoId ?? undefined,
    });
    return saved;
  }

  const finalizationPatch: Partial<QueuedJournalVideoUpload> & {
    transcriptionCompleted: true;
    finalTranscript: string;
  } = {
    stage: "merging-final-transcript",
    transcriptionCompleted: true,
    finalTranscript: saved.transcript,
  };
  updateQueuedJournalVideoUpload(meta.id, finalizationPatch);
  await mergeTranscriptIntoEntry(
    meta.userId,
    meta.entryId,
    meta.anchorOffset,
    saved.transcript,
    snap,
  );
  // The queue is the last durable local copy. Delete it only after upload,
  // transcription disposition, video-row update, and final body merge succeed.
  await removeQueuedJournalVideoUpload(meta.id);
  return saved;
}

export async function saveJournalVideoCapture(
  userId: string,
  entryId: string,
  video: Blob,
  audio: Blob | null,
  durationMs: number,
  anchorOffset: number,
  liveTranscript: string,
  chapters: JournalVideoChapter[] = [],
  peakLiveTranscript = "",
  stableRecordingId?: string,
  onUploaded?: (checkpoint: { storagePath: string; videoId: string }) => void | Promise<void>,
  existingCheckpoint?: { storagePath: string; videoId: string },
): Promise<SaveJournalVideoCaptureResult> {
  const liveCaptions = pickBestVideoJournalTranscript(liveTranscript, peakLiveTranscript);
  let storagePath = existingCheckpoint?.storagePath;
  let videoId = existingCheckpoint?.videoId;

  if (!storagePath || !videoId) {
    const uploaded = await uploadEntryVideo(
      userId,
      entryId,
      video,
      durationMs,
      stableRecordingId,
    );
    const placeholderTranscript = prepareVideoJournalTranscript(liveCaptions) || null;
    const row = await insertEntryVideo(userId, entryId, uploaded, {
      anchor_offset: anchorOffset,
      transcript: placeholderTranscript,
    });
    if (!row) throw new Error("Could not attach video to entry");
    storagePath = uploaded.storage_path;
    videoId = row.id;
    await onUploaded?.({ storagePath, videoId });
  }

  const stt = await transcribeJournalVideo(storagePath, {
    userId,
    audioBlob: audio,
    liveTranscript: liveCaptions,
    peakLiveTranscript,
  });
  let transcript = pickBestVideoJournalTranscript(stt.text, liveCaptions);
  if (transcript && chapters.length > 0) {
    transcript = applyVideoChaptersToTranscript(transcript, chapters);
  }
  if (transcript) {
    const prepared = prepareVideoJournalTranscript(transcript);
    if (prepared) {
      await updateEntryVideoTranscript(videoId, prepared);
      transcript = prepared;
    }
  }

  const retryTranscription = journalVideoTranscriptionNeedsRetry(stt, durationMs);

  return {
    transcript,
    anchorOffset,
    sttError: stt.error ?? null,
    liveTranscript,
    peakLiveTranscript: liveCaptions,
    status: retryTranscription ? "deferred-transcription" : "completed",
    uploaded: true,
    storagePath,
    videoId,
  };
}

/** Persist locally first, then upload — blobs stay queued until upload succeeds. */
export async function saveJournalVideoCaptureWithQueue(
  input: JournalVideoCaptureSaveInput,
): Promise<JournalVideoCaptureSaveOutcome> {
  const { result, durationMs, anchorOffset } = input;
  const recordedMs = result.durationMs || durationMs;
  // Reuse the crash-recovery id so a crash between enqueue and cleanup cannot
  // create a second remote object when the draft is recovered again.
  const queueId = result.recoveryDraftId ?? crypto.randomUUID();
  const liveCaptions = pickBestVideoJournalTranscript(
    result.liveTranscript,
    result.peakLiveTranscript,
  );
  const queueMeta = queueMetaFromInput(queueId, input, recordedMs);

  await enqueueJournalVideoUpload(
    queueMeta,
    result.video,
    result.audio,
    result.chapters,
  );

  // The upload queue is now the canonical durable Blob. Releasing the chunked
  // recovery copy here prevents two ~48 MB copies from competing for iOS quota.
  try {
    await clearInProgressJournalVideoRecording(result.recoveryDraftId);
  } catch (error) {
    console.warn("[journal-video] queued safely, but recovery cleanup failed:", error);
  }

  try {
    const saved = await withJournalVideoUploadQueueWaitingLock(() =>
      uploadQueuedJournalVideo(queueMeta),
    );
    return { saved, queued: saved.status !== "completed" };
  } catch (e) {
    console.warn("[journal-video] upload failed; kept local queue copy:", e);
    try {
      updateQueuedJournalVideoUpload(queueId, {
        stage: "failed",
        lastError: errorMessage(e),
        lastAttemptAt: new Date().toISOString(),
      });
    } catch (metadataError) {
      console.warn("[journal-video] could not save foreground retry state:", metadataError);
    }
    return {
      saved: {
        transcript: liveCaptions,
        anchorOffset,
        sttError: e instanceof Error ? e.message : String(e),
        liveTranscript: result.liveTranscript,
        peakLiveTranscript: liveCaptions,
        status: "deferred-retry",
        uploaded: false,
        storagePath: null,
        videoId: null,
      },
      queued: true,
    };
  }
}

export async function recoverAndSaveJournalVideoRecording(
  meta: {
    id?: string;
    userId: string;
    entryId: string;
    anchorOffset: number;
    durationMs: number;
    liveTranscript: string;
    peakLiveTranscript: string;
    bodySnapBody?: string;
    bodySnapAnchor?: number;
    chapters: JournalVideoChapter[];
  },
  video: Blob,
  audio: Blob | null,
): Promise<SaveJournalVideoCaptureResult> {
  const snap = bodySnapFromMeta(meta.bodySnapBody, meta.bodySnapAnchor);
  const liveCaptions = pickBestVideoJournalTranscript(meta.liveTranscript, meta.peakLiveTranscript);

  // No usable video bytes: secure the salvageable transcript before the caller
  // releases the recovery draft.
  if (!video || video.size === 0) {
    await mergeTranscriptIntoEntry(
      meta.userId,
      meta.entryId,
      meta.anchorOffset,
      liveCaptions,
      snap,
    );
    return {
      transcript: liveCaptions,
      anchorOffset: meta.anchorOffset,
      sttError: null,
      liveTranscript: meta.liveTranscript,
      peakLiveTranscript: liveCaptions,
      status: "completed",
      uploaded: false,
      storagePath: null,
      videoId: null,
    };
  }

  const queueId = meta.id ?? crypto.randomUUID();
  const queueMeta: QueuedJournalVideoUpload = {
    id: queueId,
    userId: meta.userId,
    entryId: meta.entryId,
    anchorOffset: meta.anchorOffset,
    durationMs: meta.durationMs,
    liveTranscript: meta.liveTranscript,
    peakLiveTranscript: meta.peakLiveTranscript,
    bodySnapBody: meta.bodySnapBody,
    bodySnapAnchor: meta.bodySnapAnchor,
    createdAt: new Date().toISOString(),
    stage: "queued",
    attemptCount: 0,
    transcriptionAttemptCount: 0,
  };
  await enqueueJournalVideoUpload(queueMeta, video, audio, meta.chapters);
  // From this point forward the upload queue, not the recovery chunk store, is
  // the canonical durable copy. uploadQueuedJournalVideo merges live words
  // before making the first network request.
  if (meta.id) {
    try {
      await clearInProgressJournalVideoRecording(meta.id);
    } catch (error) {
      console.warn("[journal-video] recovered video queued; recovery cleanup failed:", error);
    }
  }
  return withJournalVideoUploadQueueWaitingLock(() => uploadQueuedJournalVideo(queueMeta));
}
