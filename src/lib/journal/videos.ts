import { supabase } from "@/integrations/supabase/client";
import {
  isJournalVideoUploadTooLarge,
  journalVideoUploadTooLargeMessage,
} from "@/lib/journal/journalVideoLimits";
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

/** Pick the best MediaRecorder mime type supported by this browser. */
export function pickJournalVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of VIDEO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
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
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const path = `${userId}/${entryId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(JOURNAL_VIDEOS_BUCKET).upload(path, blob, {
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

/** Transcribe audio from an uploaded journal video (no second full upload). */
export async function transcribeVideoFromStorage(storagePath: string): Promise<string> {
  if (!storagePath) return "";
  try {
    const result = await transcribeJournalVoiceMemo(storagePath, "journal-videos");
    return result.ok ? result.text.trim() : "";
  } catch {
    return "";
  }
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
