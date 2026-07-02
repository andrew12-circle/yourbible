export type JournalVideoQuality = "720p" | "1080p";
export type JournalVideoCountdown = 0 | 1 | 3 | 5;
export type BubbleCorner = "bottom-left" | "bottom-right" | "top-left" | "top-right";
export type BubbleSize = "sm" | "md" | "lg";

export interface JournalVideoCaptureSettings {
  quality: JournalVideoQuality;
  countdown: JournalVideoCountdown;
  /** Last selected microphone (desktop); null = system default. */
  audioDeviceId: string | null;
  /** Desktop: draggable mini recorder over the journal. */
  floatingRecorder: boolean;
  silenceAutoPause: boolean;
  /** Screen share: capture tab/system audio when available. */
  includeSystemAudio: boolean;
  bubbleCorner: BubbleCorner;
  bubbleSize: BubbleSize;
  bubbleVisible: boolean;
}

/** Quiet mic level must hold this long before auto-pause (camera mode). */
export const JOURNAL_VIDEO_SILENCE_AUTO_PAUSE_SECONDS = 30;

export const DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS: JournalVideoCaptureSettings = {
  quality: "720p",
  countdown: 3,
  audioDeviceId: null,
  floatingRecorder: true,
  silenceAutoPause: true,
  includeSystemAudio: true,
  bubbleCorner: "bottom-left",
  bubbleSize: "md",
  bubbleVisible: true,
};

const STORAGE_KEY = "yb_journal_video_capture_settings_v1";

export function readJournalVideoCaptureSettings(): JournalVideoCaptureSettings {
  if (typeof window === "undefined") return { ...DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<JournalVideoCaptureSettings>;
    return { ...DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS };
  }
}

export function writeJournalVideoCaptureSettings(patch: Partial<JournalVideoCaptureSettings>): JournalVideoCaptureSettings {
  const next = { ...readJournalVideoCaptureSettings(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function qualityDimensions(quality: JournalVideoQuality): { width: number; height: number } {
  return quality === "1080p" ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
}
