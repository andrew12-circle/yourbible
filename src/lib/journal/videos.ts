import { supabase } from "@/integrations/supabase/client";

export interface JournalVideoRow {
  id: string;
  entry_id: string;
  storage_path: string;
  duration_ms: number | null;
  mime_type: string | null;
  created_at: string;
  url?: string;
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

/** Front camera on phones; default webcam on desktop. */
export function buildJournalVideoConstraints(): MediaStreamConstraints {
  const mobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
  return {
    audio: true,
    video: mobile
      ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 } },
  };
}

export async function uploadEntryVideo(
  userId: string,
  entryId: string,
  blob: Blob,
  durationMs?: number,
): Promise<{ storage_path: string; duration_ms?: number; mime_type: string }> {
  const mime = blob.type || pickJournalVideoMimeType() || "video/webm";
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const path = `${userId}/${entryId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("journal-videos").upload(path, blob, {
    upsert: false,
    contentType: mime,
  });
  if (error) throw new Error(error.message);
  return { storage_path: path, duration_ms: durationMs, mime_type: mime };
}

export async function getSignedVideoUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("journal-videos").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getSignedVideoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const unique = [...new Set(paths.filter(Boolean))];
  const { data, error } = await supabase.storage.from("journal-videos").createSignedUrls(unique, 3600);
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
    .select("id,entry_id,storage_path,duration_ms,mime_type,created_at")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as JournalVideoRow[];
  const urls = await getSignedVideoUrls(rows.map((r) => r.storage_path));
  return rows.map((r) => ({ ...r, url: urls[r.storage_path] }));
}

export async function insertEntryVideo(
  userId: string,
  entryId: string,
  uploaded: { storage_path: string; duration_ms?: number; mime_type: string },
): Promise<JournalVideoRow | null> {
  const { data, error } = await supabase
    .from("journal_videos")
    .insert({
      user_id: userId,
      entry_id: entryId,
      storage_path: uploaded.storage_path,
      duration_ms: uploaded.duration_ms ?? null,
      mime_type: uploaded.mime_type,
    })
    .select("id,entry_id,storage_path,duration_ms,mime_type,created_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const url = await getSignedVideoUrl(data.storage_path);
  return { ...(data as JournalVideoRow), url: url ?? undefined };
}

export async function deleteEntryVideo(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from("journal-videos").remove([storagePath]).catch(() => {});
  const { error } = await supabase.from("journal_videos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
