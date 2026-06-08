import { fetchYouTubeAudioStreamUrl } from "@/lib/youtube/fetchYouTubeAudioUrl";
import {
  bindSleepMediaSession,
  clearSleepMediaSession,
  getOrCreateSleepAudioElement,
  updateSleepMediaSession,
  updateSleepMediaSessionPosition,
} from "@/lib/bible/sleepMediaSession";

type HandoffState = {
  active: boolean;
  wasPlaying: boolean;
  startSeconds: number;
  videoId: string;
};

const audioHolder = { current: null as HTMLAudioElement | null };
let handoff: HandoffState | null = null;
let unbindMediaSession: (() => void) | null = null;
let timeUpdateHandler: (() => void) | null = null;

export function isIosYouTubeBackgroundAudioActive(): boolean {
  return handoff?.active === true;
}

export function getIosYouTubeBackgroundAudioSeconds(): number {
  const audio = audioHolder.current;
  if (!audio || !handoff?.active) return handoff?.startSeconds ?? 0;
  return Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime) : handoff.startSeconds;
}

function cleanupAudioElement(): void {
  const audio = audioHolder.current;
  if (!audio) return;
  if (timeUpdateHandler) {
    audio.removeEventListener("timeupdate", timeUpdateHandler);
    timeUpdateHandler = null;
  }
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.remove();
  audioHolder.current = null;
}

export function stopIosYouTubeBackgroundAudio(): { seconds: number; wasPlaying: boolean } {
  const seconds = getIosYouTubeBackgroundAudioSeconds();
  const wasPlaying = handoff?.wasPlaying ?? false;
  handoff = null;
  cleanupAudioElement();
  unbindMediaSession?.();
  unbindMediaSession = null;
  clearSleepMediaSession();
  return { seconds, wasPlaying };
}

function playAudioFromUrl(
  url: string,
  startSeconds: number,
  title: string | null | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = getOrCreateSleepAudioElement(audioHolder);
    const onMeta = () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onError);
      if (startSeconds > 0) {
        try {
          audio.currentTime = startSeconds;
        } catch {
          /* seek may fail on some streams */
        }
      }
      timeUpdateHandler = () => {
        if (!audio.duration || !Number.isFinite(audio.duration)) return;
        updateSleepMediaSessionPosition({
          duration: audio.duration,
          position: audio.currentTime,
        });
      };
      audio.addEventListener("timeupdate", timeUpdateHandler);
      void audio.play().then(resolve).catch(reject);
    };
    const onError = () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onError);
      reject(new Error("Background audio failed to load"));
    };
    audio.addEventListener("loadedmetadata", onMeta, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.src = url;
    audio.load();
    updateSleepMediaSession(
      { title: title?.trim() || "YouTube video", subtitle: "Sacred & Modern" },
      "playing",
    );
  });
}

/** iPhone PWA: swap iframe for direct audio when the app is backgrounded. */
export async function startIosYouTubeBackgroundAudio(opts: {
  videoId: string;
  title?: string | null;
  startSeconds: number;
}): Promise<boolean> {
  if (handoff?.active) stopIosYouTubeBackgroundAudio();

  const url = await fetchYouTubeAudioStreamUrl(opts.videoId);
  if (!url) return false;

  handoff = {
    active: true,
    wasPlaying: true,
    startSeconds: Math.max(0, opts.startSeconds),
    videoId: opts.videoId,
  };

  unbindMediaSession = bindSleepMediaSession({
    onPlay: () => {
      void audioHolder.current?.play().catch(() => {});
      updateSleepMediaSession(
        { title: opts.title?.trim() || "YouTube video", subtitle: "Sacred & Modern" },
        "playing",
      );
    },
    onPause: () => {
      audioHolder.current?.pause();
      updateSleepMediaSession(
        { title: opts.title?.trim() || "YouTube video", subtitle: "Sacred & Modern" },
        "paused",
      );
    },
  });

  try {
    await playAudioFromUrl(url, handoff.startSeconds, opts.title);
    return true;
  } catch {
    stopIosYouTubeBackgroundAudio();
    return false;
  }
}
