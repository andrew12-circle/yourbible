import { useCallback, useEffect, useRef, useState } from "react";
import { checkSleepTtsAvailable, fetchPassage, fetchSleepAudio } from "@/lib/bible/api";
import {
  isBrowserTtsSupported,
  pauseBrowserTts,
  resumeBrowserTts,
  speakBrowserTts,
  stopBrowserTts,
} from "@/lib/bible/browserTts";
import { buildScriptureChunks } from "@/lib/bible/scriptureTts";
import { getBrowserProfile } from "@/lib/bible/sleepVoices";

const LS_BIBLE_KEY = "yb.bibleId";

/** @deprecated Use buildScriptureChunks from @/lib/bible/scriptureTts */
export { buildScriptureChunks as buildVerseChunks } from "@/lib/bible/scriptureTts";

export type TtsEngine = "elevenlabs" | "browser" | null;

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

export interface NowPlayingInfo {
  title: string;
  subtitle: string;
  setId: string;
}

export interface SleepSet {
  id: string;
  label: string;
  book: string;
  chapter: number;
}

interface SleepTrack {
  key: string;
  setId: string;
  setLabel: string;
  chunkIndex: number;
  chunkCount: number;
  text: string;
  reference: string;
}

export function useSleepPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const prefetchRef = useRef<Map<string, Blob>>(new Map());
  const queueRef = useRef<SleepTrack[]>([]);
  const indexRef = useRef(0);
  const volumeRef = useRef(0.8);
  const engineRef = useRef<TtsEngine>(null);
  const elevenLabsOkRef = useRef(true);
  const usingBrowserRef = useRef(false);

  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>(null);
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState<boolean | null>(null);

  const revokeUrls = useCallback(() => {
    urlsRef.current.forEach(URL.revokeObjectURL);
    urlsRef.current = [];
  }, []);

  const cleanupAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    stopBrowserTts();
    revokeUrls();
    prefetchRef.current.clear();
    usingBrowserRef.current = false;
  }, [revokeUrls]);

  useEffect(() => () => {
    abortRef.current?.abort();
    cleanupAudio();
  }, [cleanupAudio]);

  const probeElevenLabs = useCallback(async (voiceId: string) => {
    const ok = await checkSleepTtsAvailable(voiceId);
    setElevenLabsAvailable(ok);
    elevenLabsOkRef.current = ok;
    return ok;
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const prefetch = useCallback(async (track: SleepTrack, voiceId: string) => {
    if (prefetchRef.current.has(track.key) || !elevenLabsOkRef.current) return;
    try {
      const blob = await fetchSleepAudio(track.text, voiceId);
      prefetchRef.current.set(track.key, blob);
    } catch {
      /* Prefetch failures are non-fatal */
    }
  }, []);

  const playBlob = useCallback((blob: Blob, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      const audio = new Audio(url);
      audio.volume = volumeRef.current;
      audio.preload = "auto";
      audioRef.current = audio;
      usingBrowserRef.current = false;

      const onAbort = () => {
        audio.pause();
        audio.onended = null;
        audio.ontimeupdate = null;
        audio.onerror = null;
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });

      audio.ontimeupdate = () => {
        if (!audio.duration || !Number.isFinite(audio.duration)) return;
        const qLen = queueRef.current.length || 1;
        const base = indexRef.current / qLen;
        const slice = (1 / qLen) * (audio.currentTime / audio.duration);
        setProgress(Math.min(1, base + slice));
      };

      audio.onended = () => {
        signal.removeEventListener("abort", onAbort);
        audio.ontimeupdate = null;
        resolve();
      };

      audio.onerror = () => {
        signal.removeEventListener("abort", onAbort);
        reject(new Error("Audio playback failed"));
      };

      void audio.play().catch(reject);
    });
  }, []);

  const playTrack = useCallback(
    async (track: SleepTrack, voiceId: string, signal: AbortSignal): Promise<boolean> => {
      const useBrowser =
        usingBrowserRef.current ||
        !elevenLabsOkRef.current ||
        engineRef.current === "browser";

      if (useBrowser) {
        if (!isBrowserTtsSupported()) return false;
        engineRef.current = "browser";
        setTtsEngine("browser");
        usingBrowserRef.current = true;
        audioRef.current = null;
        try {
          await speakBrowserTts(track.text, getBrowserProfile(voiceId), signal);
          return true;
        } catch (e) {
          console.warn("browser TTS failed", track.key, e);
          return false;
        }
      }

      let blob = prefetchRef.current.get(track.key);
      if (blob) prefetchRef.current.delete(track.key);
      else {
        try {
          blob = await fetchSleepAudio(track.text, voiceId);
          engineRef.current = "elevenlabs";
          setTtsEngine("elevenlabs");
        } catch (e) {
          console.warn("ElevenLabs fetch failed, trying browser TTS", track.key, e);
          elevenLabsOkRef.current = false;
          setElevenLabsAvailable(false);
          if (!isBrowserTtsSupported()) return false;
          usingBrowserRef.current = true;
          engineRef.current = "browser";
          setTtsEngine("browser");
          try {
            await speakBrowserTts(track.text, getBrowserProfile(voiceId), signal);
            return true;
          } catch (browserErr) {
            console.warn("browser TTS fallback failed", track.key, browserErr);
            return false;
          }
        }
      }

      if (signal.aborted) return false;
      try {
        await playBlob(blob, signal);
        return true;
      } catch (e) {
        console.warn("sleep chunk play failed", track.key, e);
        return false;
      }
    },
    [playBlob],
  );

  const runQueue = useCallback(
    async (voiceId: string, signal: AbortSignal) => {
      const queue = queueRef.current;
      for (let i = indexRef.current; i < queue.length; i++) {
        if (signal.aborted) return;
        indexRef.current = i;
        const track = queue[i]!;
        const titleParts = track.setLabel.split(" — ");
        setNowPlaying({
          title: titleParts[0] ?? track.setLabel,
          subtitle:
            track.chunkCount > 1
              ? `Part ${track.chunkIndex + 1} of ${track.chunkCount} · ${track.reference}`
              : track.reference,
          setId: track.setId,
        });

        for (let j = 1; j <= 3; j++) {
          const next = queue[i + j];
          if (next) void prefetch(next, voiceId);
        }

        setStatus("playing");
        const ok = await playTrack(track, voiceId, signal);
        if (!ok) continue;
      }

      if (!signal.aborted) {
        setStatus("idle");
        setNowPlaying(null);
        setProgress(0);
        setTtsEngine(null);
        engineRef.current = null;
        indexRef.current = 0;
        cleanupAudio();
      }
    },
    [cleanupAudio, playTrack, prefetch],
  );

  const buildQueue = useCallback(async (sets: SleepSet[], setIds: string[], bibleId: string) => {
    const tracks: SleepTrack[] = [];
    for (const set of sets) {
      if (!setIds.includes(set.id)) continue;
      const passage = await fetchPassage(bibleId, set.book, set.chapter);
      const chunks = buildScriptureChunks(passage.verses, passage.reference);
      const ref = passage.reference || set.label;
      chunks.forEach((text, ci) => {
        tracks.push({
          key: `${set.id}-${ci}`,
          setId: set.id,
          setLabel: set.label,
          chunkIndex: ci,
          chunkCount: chunks.length,
          text,
          reference: ref,
        });
      });
    }
    return tracks;
  }, []);

  const start = useCallback(
    async (opts: { voiceId: string; setId: string; playAll: boolean; sets: SleepSet[] }) => {
      abortRef.current?.abort();
      cleanupAudio();
      const ac = new AbortController();
      abortRef.current = ac;
      engineRef.current = null;
      elevenLabsOkRef.current = true;
      setTtsEngine(null);

      setBusy(true);
      setStatus("loading");
      try {
        const bibleId = localStorage.getItem(LS_BIBLE_KEY);
        if (!bibleId) throw new Error("Choose a translation in the reader first.");

        void probeElevenLabs(opts.voiceId);

        const setIds = opts.playAll ? opts.sets.map((s) => s.id) : [opts.setId];
        const tracks = await buildQueue(opts.sets, setIds, bibleId);
        if (!tracks.length) throw new Error("No scripture to play");

        queueRef.current = tracks;
        indexRef.current = 0;
        setProgress(0);

        for (let j = 0; j <= 3; j++) {
          const t = tracks[j];
          if (t) void prefetch(t, opts.voiceId);
        }

        await runQueue(opts.voiceId, ac.signal);
      } finally {
        setBusy(false);
        if (ac.signal.aborted) {
          setStatus("idle");
          setTtsEngine(null);
        }
      }
    },
    [buildQueue, cleanupAudio, probeElevenLabs, runQueue],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    indexRef.current = 0;
    queueRef.current = [];
    setStatus("idle");
    setNowPlaying(null);
    setProgress(0);
    setTtsEngine(null);
    engineRef.current = null;
    cleanupAudio();
  }, [cleanupAudio]);

  const togglePause = useCallback(() => {
    if (usingBrowserRef.current) {
      if (status === "playing") {
        pauseBrowserTts();
        setStatus("paused");
      } else if (status === "paused") {
        resumeBrowserTts();
        setStatus("playing");
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
    } else if (status === "paused") {
      void audio.play().catch(() => {});
      setStatus("playing");
    }
  }, [status]);

  const isActive = status === "playing" || status === "paused" || status === "loading";

  return {
    status,
    nowPlaying,
    progress,
    busy,
    ttsEngine,
    elevenLabsAvailable,
    probeElevenLabs,
    start,
    stop,
    togglePause,
    setVolume,
    isActive,
  };
}
