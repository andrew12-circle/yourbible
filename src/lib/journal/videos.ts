import { supabase } from "@/integrations/supabase/client";
import {
  isJournalVideoUploadTooLarge,
  journalVideoUploadTooLargeMessage,
} from "@/lib/journal/journalVideoLimits";
import { fixJournalVideoBlob } from "@/lib/journal/fixJournalVideoBlob";
import { transcribeJournalVoiceMemo, uploadJournalVoiceMemo } from "@/lib/journal/voiceDictation";

export interface JournalVideoRow {
  id: string;
  entry_id: string;
  storage_path: string;
  duration_ms: number | null;
  mime_type: string | null;
  transcript: string | null;
  anchor_offset: number;
  created_at: string;
  url?: string;
}

const JOURNAL_VIDEOS_BUCKET = "journal-videos";

function formatVideoStorageError(message: string): string {
  if (/bucket not found/i.test(message)) {
    return "Video storage isn't set up yet. Run `npx supabase db push --project-ref itmcsyrnpcnrwviigppe` (or apply migration 20260622160000_journal_videos.sql in the Supabase SQL editor).";
  }
  if (/journal_videos/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "Video database table isn't set up yet. Run `npx supabase db push --project-ref itmcsyrnpcnrwviigppe`.";
  }
  if (/exceeded the maximum allowed size|entitytoolarge|payload too large|too large/i.test(message)) {
    return "Video file is too large to upload (about 48 MB max). Use the on-screen countdown to stay within the 30-minute limit, or upgrade Supabase storage on your plan.";
  }
  return message;
}
const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
] as const;

/** Safari / iOS record MP4 natively — prefer it for playback compatibility. */
const VIDEO_MIME_CANDIDATES_APPLE = [
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
] as const;

function isAppleVideoCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(navigator.userAgent);
}

/** Pick the best MediaRecorder mime type supported by this browser. */
export function pickJournalVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = isAppleVideoCapture() ? VIDEO_MIME_CANDIDATES_APPLE : VIDEO_MIME_CANDIDATES;
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/** Audio-only mime for a parallel transcription track (ElevenLabs rejects video containers). */
export function pickJournalAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of AUDIO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/** Sidecar audio recorder for post-record transcription (ElevenLabs needs audio, not video). */
export function createJournalAudioSidecarRecorder(
  stream: MediaStream,
): { recorder: MediaRecorder; mimeType: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) return null;

  const audioStream = new MediaStream(audioTracks);
  const preferred = pickJournalAudioMimeType();
  const candidates = preferred
    ? [preferred, ...AUDIO_MIME_CANDIDATES.filter((t) => t !== preferred)]
    : [...AUDIO_MIME_CANDIDATES];

  for (const mimeType of candidates) {
    if (!MediaRecorder.isTypeSupported(mimeType)) continue;
    try {
      return { recorder: new MediaRecorder(audioStream, { mimeType }), mimeType };
    } catch {
      /* try next */
    }
  }

  try {
    return { recorder: new MediaRecorder(audioStream), mimeType: "audio/webm" };
  } catch {
    return null;
  }
}

export function stopMediaRecorderWithFlush(recorder: MediaRecorder | null): boolean {
  if (!recorder || recorder.state === "inactive") return false;
  try {
    if (typeof recorder.requestData === "function") recorder.requestData();
    recorder.stop();
    return true;
  } catch {
    try {
      recorder.stop();
      return true;
    } catch {
      return false;
    }
  }
}

export function journalVideoCaptureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined" &&
    pickJournalVideoMimeType() !== ""
  );
}

function isMobileVideoCapture(): boolean {
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
  );
}

/** Front camera on phones; default webcam on desktop. Mobile uses 480p to stay under upload caps. */
export function buildJournalVideoConstraints(): MediaStreamConstraints {
  const mobile = isMobileVideoCapture();
  return {
    audio: true,
    video: mobile
      ? {
          facingMode: "user",
          width: { ideal: 480, max: 640 },
          height: { ideal: 480, max: 640 },
          frameRate: { ideal: 20, max: 24 },
        }
      : { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { max: 30 } },
  };
}

/** Tighten an acquired stream (iOS often ignores initial constraints). */
export async function tuneJournalVideoStream(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const mobile = isMobileVideoCapture();
  try {
    await track.applyConstraints(
      mobile
        ? {
            width: { max: 640 },
            height: { max: 640 },
            frameRate: { max: 24 },
          }
        : {
            width: { max: 1280 },
            height: { max: 720 },
            frameRate: { max: 30 },
          },
    );
  } catch {
    /* best effort */
  }
}

export async function uploadEntryVideo(
  userId: string,
  entryId: string,
  blob: Blob,
  durationMs?: number,
): Promise<{ storage_path: string; duration_ms?: number; mime_type: string }> {
  if (isJournalVideoUploadTooLarge(blob.size)) {
    throw new Error(journalVideoUploadTooLargeMessage(durationMs ?? 0, blob.size));
  }
  const mime = blob.type || pickJournalVideoMimeType() || "video/webm";
  const uploadBlob =
    durationMs && mime.includes("webm") ? await fixJournalVideoBlob(blob, durationMs) : blob;
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const path = `${userId}/${entryId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(JOURNAL_VIDEOS_BUCKET).upload(path, uploadBlob, {
    upsert: false,
    contentType: mime,
  });
  if (error) throw new Error(formatVideoStorageError(error.message));
  return { storage_path: path, duration_ms: durationMs, mime_type: mime };
}

export async function getSignedVideoUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(JOURNAL_VIDEOS_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getSignedVideoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const unique = [...new Set(paths.filter(Boolean))];
  const { data, error } = await supabase.storage.from(JOURNAL_VIDEOS_BUCKET).createSignedUrls(unique, 3600);
  if (error) {
    console.warn("[journal-videos] createSignedUrls failed:", error.message);
    return {};
  }
  const map: Record<string, string> = {};
  data?.forEach((row) => {
    if (row.path && row.signedUrl && !row.error) map[row.path] = row.signedUrl;
  });
  return map;
}

export async function fetchEntryVideos(entryId: string): Promise<JournalVideoRow[]> {
  const { data, error } = await supabase
    .from("journal_videos")
    .select("id,entry_id,storage_path,duration_ms,mime_type,transcript,anchor_offset,created_at")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(formatVideoStorageError(error.message));
  const rows = (data ?? []) as JournalVideoRow[];
  const urls = await getSignedVideoUrls(rows.map((r) => r.storage_path));
  return rows.map((r) => ({
    ...(r as JournalVideoRow),
    anchor_offset: (r as JournalVideoRow).anchor_offset ?? 0,
    transcript: (r as JournalVideoRow).transcript ?? null,
    url: urls[r.storage_path],
  }));
}

export async function insertEntryVideo(
  userId: string,
  entryId: string,
  uploaded: { storage_path: string; duration_ms?: number; mime_type: string },
  opts?: { anchor_offset?: number; transcript?: string | null },
): Promise<JournalVideoRow | null> {
  const { data, error } = await supabase
    .from("journal_videos")
    .insert({
      user_id: userId,
      entry_id: entryId,
      storage_path: uploaded.storage_path,
      duration_ms: uploaded.duration_ms ?? null,
      mime_type: uploaded.mime_type,
      anchor_offset: opts?.anchor_offset ?? 0,
      transcript: opts?.transcript ?? null,
    })
    .select("id,entry_id,storage_path,duration_ms,mime_type,transcript,anchor_offset,created_at")
    .maybeSingle();
  if (error) throw new Error(formatVideoStorageError(error.message));
  if (!data) return null;
  const url = await getSignedVideoUrl(data.storage_path);
  return { ...(data as JournalVideoRow), url: url ?? undefined };
}

export async function updateEntryVideoTranscript(
  videoId: string,
  transcript: string,
): Promise<void> {
  const { error } = await supabase.from("journal_videos").update({ transcript }).eq("id", videoId);
  if (error) throw new Error(formatVideoStorageError(error.message));
}

export type TranscribeJournalVideoOptions = {
  userId?: string;
  /** Small audio-only sidecar recorded alongside the video. */
  audioBlob?: Blob | null;
  /** Live speech captions shown during recording (fallback when server STT fails). */
  liveTranscript?: string;
};

export type TranscribeJournalVideoResult = {
  text: string;
  source: "audio-sidecar" | "live" | "none";
  error?: string;
};

const MIN_JOURNAL_VIDEO_AUDIO_BYTES = 200;

/** User-facing hint when no transcript could be produced. */
export function journalVideoTranscriptEmptyMessage(opts: {
  sttError?: string;
  hadLiveCaption: boolean;
  hadAudioSidecar: boolean;
}): string {
  if (opts.sttError?.trim()) return opts.sttError.trim();
  if (opts.hadLiveCaption) {
    return "Live captions didn't save — try Chrome or Edge and allow microphone access.";
  }
  if (!opts.hadAudioSidecar) {
    return "No audio was captured for transcription. Check mic permissions and try Chrome or Edge.";
  }
  return "Couldn't detect speech. Speak after the countdown and stay close to the mic.";
}

/** Transcribe a journal video — prefers audio sidecar, then live captions from recording. */
export async function transcribeJournalVideo(
  _storagePath: string,
  opts: TranscribeJournalVideoOptions = {},
): Promise<TranscribeJournalVideoResult> {
  const live = opts.liveTranscript?.trim() ?? "";
  let lastError: string | undefined;
  const audio = opts.audioBlob;

  if (live) {
    // Keep server STT as a quality upgrade when available, but never discard live captions.
  }

  if (audio && audio.size > MIN_JOURNAL_VIDEO_AUDIO_BYTES && opts.userId) {
    try {
      const path = await uploadJournalVoiceMemo(opts.userId, audio);
      const result = await transcribeJournalVoiceMemo(path, "voice-memos");
      if (result.ok && result.text.trim()) {
        return { text: result.text.trim(), source: "audio-sidecar" };
      }
      if (!result.ok) lastError = result.error;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  } else if (audio && audio.size > 0 && audio.size <= MIN_JOURNAL_VIDEO_AUDIO_BYTES) {
    lastError = "Audio was too short to transcribe — record a little longer.";
  } else if (!audio?.size) {
    lastError = "No audio track was captured for transcription.";
  }

  if (live) {
    return { text: live, source: "live", error: lastError };
  }

  return { text: "", source: "none", error: lastError };
}

/** @deprecated Use transcribeJournalVideo — kept for call sites that only pass storage path. */
export async function transcribeVideoFromStorage(storagePath: string): Promise<string> {
  return (await transcribeJournalVideo(storagePath)).text;
}

/** @deprecated Prefer transcribeVideoFromStorage after upload. */
export async function transcribeVideoBlob(userId: string, blob: Blob): Promise<string> {
  if (blob.size < 800) return "";
  try {
    const path = await uploadJournalVoiceMemo(userId, blob);
    const result = await transcribeJournalVoiceMemo(path);
    return result.ok ? result.text.trim() : "";
  } catch {
    return "";
  }
}

export async function deleteEntryVideo(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from(JOURNAL_VIDEOS_BUCKET).remove([storagePath]).catch(() => {});
  const { error } = await supabase.from("journal_videos").delete().eq("id", id);
  if (error) throw new Error(formatVideoStorageError(error.message));
}
