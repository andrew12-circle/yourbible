import { supabase } from "@/integrations/supabase/client";
import {
  JOURNAL_VIDEO_BITS_PER_SECOND,
  JOURNAL_VIDEO_TARGET_BITS_PER_SECOND,
  isJournalVideoUploadTooLarge,
  journalVideoUploadTooLargeMessage,
} from "@/lib/journal/journalVideoLimits";
import { fixJournalVideoBlob } from "@/lib/journal/fixJournalVideoBlob";
import type { JournalVideoQuality } from "@/lib/journal/journalVideoCaptureSettings";
import { qualityDimensions } from "@/lib/journal/journalVideoCaptureSettings";
import type { CameraFacing } from "@/lib/journal/journalVideoDevices";
import { pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";
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

/**
 * Chunk interval for ondataavailable. One-second segments keep recovery writes
 * frequent enough to be useful without churning durable storage four times a
 * second on browsers that support shorter slices.
 */
export function journalVideoRecorderTimesliceMs(): number {
  return 1000;
}

/**
 * Create a MediaRecorder that actually constructs on this browser.
 * Safari/iPad often rejects bitrate options or specific mime types even when
 * isTypeSupported() returned true — try several combinations.
 */
export function createJournalVideoMediaRecorder(
  stream: MediaStream,
): { recorder: MediaRecorder; mimeType: string } | null {
  if (typeof MediaRecorder === "undefined") return null;

  const preferred = pickJournalVideoMimeType();
  const pool = isAppleVideoCapture() ? VIDEO_MIME_CANDIDATES_APPLE : VIDEO_MIME_CANDIDATES;
  const mimeCandidates = [
    ...(preferred ? [preferred] : []),
    ...pool.filter((t) => t !== preferred && MediaRecorder.isTypeSupported(t)),
    "", // browser default as last resort
  ];

  for (const mimeType of mimeCandidates) {
    const optionSets: MediaRecorderOptions[] = [];
    if (mimeType) {
      optionSets.push({
        mimeType,
        bitsPerSecond: JOURNAL_VIDEO_TARGET_BITS_PER_SECOND,
        videoBitsPerSecond: JOURNAL_VIDEO_BITS_PER_SECOND.video,
        audioBitsPerSecond: JOURNAL_VIDEO_BITS_PER_SECOND.audio,
      });
      optionSets.push({ mimeType });
    } else {
      optionSets.push({});
    }

    for (const options of optionSets) {
      try {
        const recorder = new MediaRecorder(stream, options);
        return {
          recorder,
          mimeType: recorder.mimeType || mimeType || "video/mp4",
        };
      } catch {
        /* try next mime / options combo */
      }
    }
  }

  return null;
}

/**
 * Start recording with a timeslice when possible.
 * Some Safari builds throw on start(timeslice) — fall back to start().
 * Reject only if the recorder is still inactive after both attempts.
 */
export function startJournalMediaRecorder(
  recorder: MediaRecorder,
  timesliceMs: number = journalVideoRecorderTimesliceMs(),
): void {
  try {
    recorder.start(timesliceMs);
  } catch {
    recorder.start();
  }
  if (recorder.state === "inactive") {
    throw new Error("MediaRecorder failed to enter recording state");
  }
}

/** Stable id for in-progress recording recovery (works when randomUUID is missing). */
export function createJournalVideoRecoveryId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
  );
}

/** HD widescreen — matches typical webcam output (16:9). */
export const JOURNAL_VIDEO_ASPECT_RATIO = 16 / 9;
const JOURNAL_VIDEO_PORTRAIT_ASPECT_RATIO = 9 / 16;

export type JournalVideoConstraintOptions = {
  quality?: JournalVideoQuality;
  facingMode?: CameraFacing;
  deviceId?: string | null;
  audioDeviceId?: string | null;
};

function mobileVideoCaptureIsPortrait(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(orientation: portrait)").matches;
    }
  } catch {
    /* fall back to the current viewport dimensions */
  }
  return window.innerHeight >= window.innerWidth;
}

function journalVideoCaptureDimensions(
  mobile: boolean,
  quality: JournalVideoQuality,
): { width: number; height: number; aspectRatio: number } {
  const dimensions = qualityDimensions(quality);
  if (mobile && mobileVideoCaptureIsPortrait()) {
    return {
      width: dimensions.height,
      height: dimensions.width,
      aspectRatio: JOURNAL_VIDEO_PORTRAIT_ASPECT_RATIO,
    };
  }
  return { ...dimensions, aspectRatio: JOURNAL_VIDEO_ASPECT_RATIO };
}

function journalVideoTrackConstraints(
  mobile: boolean,
  options: JournalVideoConstraintOptions = {},
): MediaTrackConstraints {
  const { width, height, aspectRatio } = journalVideoCaptureDimensions(
    mobile,
    options.quality ?? "720p",
  );
  const video: MediaTrackConstraints = {
    aspectRatio: { ideal: aspectRatio },
    width: { ideal: width, max: width },
    height: { ideal: height, max: height },
    frameRate: mobile ? { ideal: 24, max: 30 } : { ideal: 30, max: 30 },
  };
  if (options.deviceId) {
    video.deviceId = { exact: options.deviceId };
  } else if (mobile || options.facingMode) {
    video.facingMode = options.facingMode ?? (mobile ? "user" : undefined);
  }
  return video;
}

/** Front camera on phones; default webcam on desktop — 16:9 HD or Full HD. */
export function buildJournalVideoConstraints(
  options: JournalVideoConstraintOptions = {},
): MediaStreamConstraints {
  const mobile = isMobileVideoCapture();
  const audio = options.audioDeviceId
    ? { deviceId: { exact: options.audioDeviceId } }
    : true;
  return {
    audio,
    video: journalVideoTrackConstraints(mobile, options),
  };
}

export type MediaStreamTrackKind = "video" | "audio";

/** Swap live tracks on a stream without recreating the MediaStream (keeps MediaRecorder attached). */
export function replaceMediaStreamTracks(
  target: MediaStream,
  donor: MediaStream,
  kinds: MediaStreamTrackKind[],
): void {
  for (const kind of kinds) {
    const oldTracks = kind === "video" ? target.getVideoTracks() : target.getAudioTracks();
    const newTracks = kind === "video" ? donor.getVideoTracks() : donor.getAudioTracks();
    for (const track of oldTracks) {
      target.removeTrack(track);
      track.stop();
    }
    for (const track of newTracks) {
      target.addTrack(track);
    }
  }
  for (const track of donor.getTracks()) {
    if (!target.getTracks().includes(track)) track.stop();
  }
}

/** Tighten an acquired stream (iOS often ignores initial constraints). */
export async function tuneJournalVideoStream(
  stream: MediaStream,
  quality: JournalVideoQuality = "720p",
): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const { width, height, aspectRatio } = journalVideoCaptureDimensions(
    isMobileVideoCapture(),
    quality,
  );
  try {
    await track.applyConstraints({
      aspectRatio: { ideal: aspectRatio },
      width: { max: width },
      height: { max: height },
      frameRate: { max: 30 },
    });
  } catch {
    /* best effort */
  }
}

export function buildJournalVideoStoragePath(
  userId: string,
  entryId: string,
  mime: string,
  stableRecordingId?: string,
): { path: string; idempotent: boolean } {
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const stableObjectName = stableRecordingId
    ?.trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128);
  const objectName = stableObjectName || crypto.randomUUID();
  return {
    path: `${userId}/${entryId}/${objectName}.${ext}`,
    idempotent: Boolean(stableObjectName),
  };
}

const JOURNAL_VIDEO_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackJournalVideoHashBytes(value: string): Uint8Array {
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  seeds.forEach((seed, index) => {
    let hash = seed;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
      hash ^= hash >>> 13;
    }
    hash ^= value.length + index;
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    view.setUint32(index * 4, (hash ^ (hash >>> 16)) >>> 0);
  });
  return bytes;
}

function journalVideoUuidFromBytes(source: Uint8Array): string {
  const bytes = source.slice(0, 16);
  // Mark deterministic hashes as RFC 4122 version 5 / standard variant UUIDs.
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Deterministic row id for every durable recording id, including legacy non-UUID ids. */
export async function deriveJournalVideoRecordingRowId(
  userId: string,
  entryId: string,
  stableRecordingId?: string,
): Promise<string | undefined> {
  const normalized = stableRecordingId?.trim();
  if (!normalized) return undefined;
  if (JOURNAL_VIDEO_UUID_PATTERN.test(normalized)) return normalized.toLowerCase();

  const scopedId = `yourbible-journal-video\u0000${userId}\u0000${entryId}\u0000${normalized}`;
  let hashBytes: Uint8Array | null = null;
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      hashBytes = new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(scopedId)),
      );
    }
  } catch {
    // Deterministic JS hashing remains available in older MediaRecorder browsers.
  }
  return journalVideoUuidFromBytes(hashBytes ?? fallbackJournalVideoHashBytes(scopedId));
}

export async function uploadEntryVideo(
  userId: string,
  entryId: string,
  blob: Blob,
  durationMs?: number,
  stableRecordingId?: string,
): Promise<{
  storage_path: string;
  duration_ms?: number;
  mime_type: string;
  recording_id?: string;
}> {
  if (isJournalVideoUploadTooLarge(blob.size)) {
    throw new Error(journalVideoUploadTooLargeMessage(durationMs ?? 0, blob.size));
  }
  const mime = blob.type || pickJournalVideoMimeType() || "video/webm";
  const uploadBlob =
    durationMs && mime.includes("webm") ? await fixJournalVideoBlob(blob, durationMs) : blob;
  const { path, idempotent } = buildJournalVideoStoragePath(
    userId,
    entryId,
    mime,
    stableRecordingId,
  );
  const { error } = await supabase.storage.from(JOURNAL_VIDEOS_BUCKET).upload(path, uploadBlob, {
    // A durable queue id makes crash retries overwrite the same object instead
    // of leaking a new random upload on every attempt.
    upsert: idempotent,
    contentType: mime,
  });
  if (error) throw new Error(formatVideoStorageError(error.message));
  const recordingId = await deriveJournalVideoRecordingRowId(
    userId,
    entryId,
    stableRecordingId,
  );
  return {
    storage_path: path,
    duration_ms: durationMs,
    mime_type: mime,
    recording_id: recordingId,
  };
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
  uploaded: {
    storage_path: string;
    duration_ms?: number;
    mime_type: string;
    recording_id?: string;
  },
  opts?: { anchor_offset?: number; transcript?: string | null },
): Promise<JournalVideoRow | null> {
  const select =
    "id,entry_id,storage_path,duration_ms,mime_type,transcript,anchor_offset,created_at";
  // The upload queue retries with a deterministic storage path. If the browser
  // crashed after this row was inserted but before local cleanup, reuse it.
  const { data: existing, error: existingError } = await supabase
    .from("journal_videos")
    .select(select)
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .eq("storage_path", uploaded.storage_path)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(formatVideoStorageError(existingError.message));
  if (existing) {
    const url = await getSignedVideoUrl(existing.storage_path);
    return { ...(existing as JournalVideoRow), url: url ?? undefined };
  }

  const rowInput = {
    ...(uploaded.recording_id ? { id: uploaded.recording_id } : {}),
    user_id: userId,
    entry_id: entryId,
    storage_path: uploaded.storage_path,
    duration_ms: uploaded.duration_ms ?? null,
    mime_type: uploaded.mime_type,
    anchor_offset: opts?.anchor_offset ?? 0,
    transcript: opts?.transcript ?? null,
  };
  // Queue/recovery ids are UUIDs, so the table primary key gives concurrent
  // tabs an atomic idempotency key without requiring a risky data migration.
  // DO NOTHING is essential: a late duplicate must never replace a richer
  // transcript already written by the first successful attempt.
  if (uploaded.recording_id) {
    const { error: insertError } = await supabase
      .from("journal_videos")
      .upsert(rowInput, { onConflict: "id", ignoreDuplicates: true });
    if (insertError) throw new Error(formatVideoStorageError(insertError.message));

    const { data: canonical, error: canonicalError } = await supabase
      .from("journal_videos")
      .select(select)
      .eq("id", uploaded.recording_id)
      .maybeSingle();
    if (canonicalError) throw new Error(formatVideoStorageError(canonicalError.message));
    if (!canonical) return null;
    if (
      canonical.entry_id !== entryId ||
      canonical.storage_path !== uploaded.storage_path
    ) {
      throw new Error("The durable video recording id conflicts with another journal video.");
    }
    const url = await getSignedVideoUrl(canonical.storage_path);
    return { ...(canonical as JournalVideoRow), url: url ?? undefined };
  }

  const { data, error } = await supabase
    .from("journal_videos")
    .insert(rowInput)
    .select(select)
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
  /** Longest live caption string seen during recording (peak before pause or during recording). */
  peakLiveTranscript?: string;
};

export type TranscribeJournalVideoResult = {
  text: string;
  source: "audio-sidecar" | "storage-video" | "live" | "none";
  error?: string;
  /** True when either server-side audio path returned usable speech. */
  serverTranscriptSucceeded: boolean;
  /** Durable queue disposition; independent from whichever candidate text is longest. */
  disposition: "complete" | "retryable-error" | "terminal-no-speech";
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

type TranscriptCandidate = {
  text: string;
  source: Exclude<TranscribeJournalVideoResult["source"], "none">;
};

function isTerminalJournalVideoSpeechError(error: string): boolean {
  return (
    /empty transcript/i.test(error) ||
    /nothing to transcribe/i.test(error) ||
    /couldn.?t detect speech/i.test(error) ||
    /no (?:usable )?(?:speech|voice|words)(?: was| were)? (?:detected|found|captured)/i.test(error) ||
    /no audio (?:track )?(?:was )?captured/i.test(error) ||
    /speech (?:was )?not detected/i.test(error) ||
    /too short|record a little longer/i.test(error)
  );
}

/** Pick the longest transcript — server STT beats partial live captions. */
function pickBestTranscriptCandidate(candidates: TranscriptCandidate[]): TranscriptCandidate | null {
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (cur.text.length > best.text.length ? cur : best));
}

/** Transcribe a journal video — audio sidecar, stored video file, then live captions. */
export async function transcribeJournalVideo(
  storagePath: string,
  opts: TranscribeJournalVideoOptions = {},
): Promise<TranscribeJournalVideoResult> {
  const live = pickBestVideoJournalTranscript(opts.liveTranscript, opts.peakLiveTranscript);
  const audio = opts.audioBlob;
  const candidates: TranscriptCandidate[] = [];
  const retryableErrors: string[] = [];
  const terminalErrors: string[] = [];
  let serverTranscriptSucceeded = false;
  const recordError = (error: string) => {
    const normalized = error.trim();
    if (!normalized) return;
    if (isTerminalJournalVideoSpeechError(normalized)) terminalErrors.push(normalized);
    else retryableErrors.push(normalized);
  };

  if (audio && audio.size > MIN_JOURNAL_VIDEO_AUDIO_BYTES && opts.userId) {
    let sidecarPath: string | null = null;
    try {
      sidecarPath = await uploadJournalVoiceMemo(opts.userId, audio);
      const result = await transcribeJournalVoiceMemo(sidecarPath, "voice-memos");
      if (result.ok && result.text.trim()) {
        candidates.push({ text: result.text.trim(), source: "audio-sidecar" });
        serverTranscriptSucceeded = true;
      } else if (result.ok) {
        recordError("Empty transcript returned for the captured audio.");
      } else if (!result.ok) {
        recordError(result.error);
      }
    } catch (e) {
      recordError(e instanceof Error ? e.message : String(e));
    } finally {
      // The queue retains the local audio Blob for retry. The uploaded sidecar
      // is only a transcription transport and must not leak on every attempt.
      if (sidecarPath) {
        try {
          const { error } = await supabase.storage.from("voice-memos").remove([sidecarPath]);
          if (error) console.warn("[journal-video] audio sidecar cleanup failed:", error.message);
        } catch (error) {
          console.warn("[journal-video] audio sidecar cleanup failed:", error);
        }
      }
    }
  } else if (audio && audio.size > 0 && audio.size <= MIN_JOURNAL_VIDEO_AUDIO_BYTES) {
    recordError("Audio was too short to transcribe — record a little longer.");
  } else if (!audio?.size && !storagePath) {
    recordError("No audio track was captured for transcription.");
  }

  if (storagePath && opts.userId) {
    try {
      const result = await transcribeJournalVoiceMemo(storagePath, "journal-videos");
      if (result.ok && result.text.trim()) {
        candidates.push({ text: result.text.trim(), source: "storage-video" });
        serverTranscriptSucceeded = true;
      } else if (result.ok) {
        recordError("Empty transcript returned for the captured video.");
      } else if (!result.ok) {
        recordError(result.error);
      }
    } catch (e) {
      recordError(e instanceof Error ? e.message : String(e));
    }
  }

  if (live) {
    candidates.push({ text: live, source: "live" });
  }

  const best = pickBestTranscriptCandidate(candidates);
  const disposition: TranscribeJournalVideoResult["disposition"] = serverTranscriptSucceeded
    ? "complete"
    : retryableErrors.length > 0
      ? "retryable-error"
      : terminalErrors.length > 0
        ? "terminal-no-speech"
        : "complete";
  const error =
    disposition === "retryable-error"
      ? retryableErrors[retryableErrors.length - 1]
      : disposition === "terminal-no-speech"
        ? terminalErrors[terminalErrors.length - 1]
        : undefined;

  return {
    text: best?.text ?? "",
    source: best?.source ?? "none",
    ...(error ? { error } : {}),
    serverTranscriptSucceeded,
    disposition,
  };
}

/** Re-run server transcription from a stored journal video (recovery after partial live captions). */
export async function retranscribeJournalEntryVideo(
  userId: string,
  storagePath: string,
): Promise<TranscribeJournalVideoResult> {
  return transcribeJournalVideo(storagePath, { userId, liveTranscript: "" });
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
