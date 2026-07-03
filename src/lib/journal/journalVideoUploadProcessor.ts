import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
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
  type QueuedJournalVideoUpload,
} from "@/lib/journal/journalVideoUploadQueue";
import {
  insertEntryVideo,
  transcribeJournalVideo,
  updateEntryVideoTranscript,
  uploadEntryVideo,
} from "@/lib/journal/videos";

export type ProcessJournalVideoUploadResult = {
  processed: number;
  failed: number;
};

export type SaveJournalVideoCaptureResult = {
  transcript: string;
  anchorOffset: number;
  sttError: string | null;
  liveTranscript: string;
  peakLiveTranscript: string;
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
  try {
    await persistVideoJournalTranscriptToEntry(userId, entryId, transcript, anchorOffset, bodySnap);
  } catch (e) {
    console.warn("[journal-video] entry body merge failed:", e);
  }
}

export async function processJournalVideoUploadQueue(): Promise<ProcessJournalVideoUploadResult> {
  const queue = listQueuedJournalVideoUploads();
  let processed = 0;
  let failed = 0;

  for (const meta of queue) {
    try {
      await uploadQueuedJournalVideo(meta);
      processed += 1;
    } catch (e) {
      console.warn("[journal-video-queue] retry failed:", e);
      failed += 1;
    }
  }

  return { processed, failed };
}

export async function uploadQueuedJournalVideo(
  meta: QueuedJournalVideoUpload,
): Promise<SaveJournalVideoCaptureResult> {
  const payload = await readQueuedJournalVideoUpload(meta.id);
  if (!payload) {
    await removeQueuedJournalVideoUpload(meta.id);
    throw new Error("Queued video data is missing");
  }

  const saved = await saveJournalVideoCapture(
    meta.userId,
    meta.entryId,
    payload.video,
    payload.audio,
    meta.durationMs,
    meta.anchorOffset,
    meta.liveTranscript,
    payload.chapters,
    meta.peakLiveTranscript ?? "",
  );
  await removeQueuedJournalVideoUpload(meta.id);
  await mergeTranscriptIntoEntry(
    meta.userId,
    meta.entryId,
    meta.anchorOffset,
    saved.transcript,
    bodySnapFromMeta(meta.bodySnapBody, meta.bodySnapAnchor),
  );
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
): Promise<SaveJournalVideoCaptureResult> {
  const uploaded = await uploadEntryVideo(userId, entryId, video, durationMs);
  const liveCaptions = pickBestVideoJournalTranscript(liveTranscript, peakLiveTranscript);
  const placeholderTranscript = prepareVideoJournalTranscript(liveCaptions) || liveCaptions || null;
  const row = await insertEntryVideo(userId, entryId, uploaded, {
    anchor_offset: anchorOffset,
    transcript: placeholderTranscript,
  });
  if (!row) throw new Error("Could not attach video to entry");

  const stt = await transcribeJournalVideo(uploaded.storage_path, {
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
    const prepared = prepareVideoJournalTranscript(transcript) || transcript;
    await updateEntryVideoTranscript(row.id, prepared);
    transcript = prepared;
  }

  return {
    transcript,
    anchorOffset,
    sttError: stt.error ?? null,
    liveTranscript,
    peakLiveTranscript: liveCaptions,
  };
}

/** Persist locally first, then upload — blobs stay queued until upload succeeds. */
export async function saveJournalVideoCaptureWithQueue(
  input: JournalVideoCaptureSaveInput,
): Promise<JournalVideoCaptureSaveOutcome> {
  const { userId, entryId, result, durationMs, anchorOffset, bodySnap } = input;
  const recordedMs = result.durationMs || durationMs;
  const queueId = crypto.randomUUID();
  const liveCaptions = pickBestVideoJournalTranscript(
    result.liveTranscript,
    result.peakLiveTranscript,
  );

  await enqueueJournalVideoUpload(
    queueMetaFromInput(queueId, input, recordedMs),
    result.video,
    result.audio,
    result.chapters,
  );

  try {
    const saved = await saveJournalVideoCapture(
      userId,
      entryId,
      result.video,
      result.audio,
      recordedMs,
      anchorOffset,
      result.liveTranscript,
      result.chapters,
      result.peakLiveTranscript,
    );
    await removeQueuedJournalVideoUpload(queueId);
    void clearInProgressJournalVideoRecording(result.recoveryDraftId);
    await mergeTranscriptIntoEntry(
      userId,
      entryId,
      anchorOffset,
      saved.transcript,
      bodySnap ?? null,
    );
    return { saved, queued: false };
  } catch (e) {
    console.warn("[journal-video] upload failed; kept local queue copy:", e);
    return {
      saved: {
        transcript: liveCaptions,
        anchorOffset,
        sttError: e instanceof Error ? e.message : String(e),
        liveTranscript: result.liveTranscript,
        peakLiveTranscript: liveCaptions,
      },
      queued: true,
    };
  }
}

export async function recoverAndSaveJournalVideoRecording(
  meta: {
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
  const saved = await saveJournalVideoCapture(
    meta.userId,
    meta.entryId,
    video,
    audio,
    meta.durationMs,
    meta.anchorOffset,
    meta.liveTranscript,
    meta.chapters,
    meta.peakLiveTranscript,
  );
  await mergeTranscriptIntoEntry(
    meta.userId,
    meta.entryId,
    meta.anchorOffset,
    saved.transcript,
    bodySnapFromMeta(meta.bodySnapBody, meta.bodySnapAnchor),
  );
  return saved;
}
