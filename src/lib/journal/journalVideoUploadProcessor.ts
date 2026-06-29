import {
  applyVideoChaptersToTranscript,
  type JournalVideoChapter,
} from "@/lib/journal/journalVideoChapters";
import {
  dequeueJournalVideoUpload,
  listQueuedJournalVideoUploads,
  type QueuedJournalVideoUpload,
} from "@/lib/journal/journalVideoUploadQueue";
import {
  insertEntryVideo,
  transcribeJournalVideo,
  updateEntryVideoTranscript,
  uploadEntryVideo,
} from "@/lib/journal/videos";
import { pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";

export type ProcessJournalVideoUploadResult = {
  processed: number;
  failed: number;
};

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
): Promise<void> {
  const payload = await dequeueJournalVideoUpload(meta.id);
  if (!payload) return;

  await saveJournalVideoCapture(
    meta.userId,
    meta.entryId,
    payload.video,
    payload.audio,
    meta.durationMs,
    meta.anchorOffset,
    meta.liveTranscript,
    payload.chapters,
  );
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
): Promise<{ transcript: string; anchorOffset: number; sttError: string | null; liveTranscript: string; peakLiveTranscript: string }> {
  const uploaded = await uploadEntryVideo(userId, entryId, video, durationMs);
  const row = await insertEntryVideo(userId, entryId, uploaded, { anchor_offset: anchorOffset });
  if (!row) throw new Error("Could not attach video to entry");

  const liveCaptions = pickBestVideoJournalTranscript(liveTranscript, peakLiveTranscript);
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
    await updateEntryVideoTranscript(row.id, transcript);
  }

  return { transcript, anchorOffset, sttError: stt.error ?? null, liveTranscript, peakLiveTranscript: liveCaptions };
}
