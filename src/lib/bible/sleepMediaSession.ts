import { APP_NAME } from "@/lib/appBrand";

export interface SleepMediaSessionTrack {
  title: string;
  subtitle: string;
  artist?: string;
}

export function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

/** Hidden DOM audio element — iOS keeps background playback more reliably than detached `Audio()`. */
export function getOrCreateSleepAudioElement(
  holder: { current: HTMLAudioElement | null },
): HTMLAudioElement {
  if (holder.current) return holder.current;
  const audio = document.createElement("audio");
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.style.display = "none";
  document.body.appendChild(audio);
  holder.current = audio;
  return audio;
}

export function detachSleepAudioElement(holder: { current: HTMLAudioElement | null }): void {
  const audio = holder.current;
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.remove();
  holder.current = null;
}

export function bindSleepMediaSession(handlers: {
  onPlay: () => void;
  onPause: () => void;
  onStop?: () => void;
}): () => void {
  if (!isMediaSessionSupported()) return () => {};
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", handlers.onPlay);
  ms.setActionHandler("pause", handlers.onPause);
  ms.setActionHandler("stop", handlers.onStop ?? handlers.onPause);
  return () => {
    ms.setActionHandler("play", null);
    ms.setActionHandler("pause", null);
    ms.setActionHandler("stop", null);
    clearSleepMediaSession();
  };
}

export function updateSleepMediaSession(
  track: SleepMediaSessionTrack | null,
  playbackState: MediaSessionPlaybackState,
): void {
  if (!isMediaSessionSupported()) return;
  const ms = navigator.mediaSession;
  ms.playbackState = playbackState;
  if (!track) {
    ms.metadata = null;
    return;
  }
  ms.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist ?? `${APP_NAME} · Sleep`,
    album: track.subtitle,
  });
}

export function updateSleepMediaSessionPosition(opts: {
  duration: number;
  position: number;
  playbackRate?: number;
}): void {
  if (!isMediaSessionSupported() || !navigator.mediaSession.setPositionState) return;
  const { duration, position, playbackRate = 1 } = opts;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;
  try {
    navigator.mediaSession.setPositionState({ duration, position, playbackRate });
  } catch {
    /* Invalid state for the current clip */
  }
}

export function clearSleepMediaSession(): void {
  updateSleepMediaSession(null, "none");
}
