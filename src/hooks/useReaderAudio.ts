import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSleepAudio, type Passage } from "@/lib/bible/api";
import {
  isBrowserTtsSupported,
  pauseBrowserTts,
  resumeBrowserTts,
  speakBrowserTts,
  stopBrowserTts,
} from "@/lib/bible/browserTts";
import { buildScriptureChunks } from "@/lib/bible/scriptureTts";
import {
  bindSleepMediaSession,
  clearSleepMediaSession,
  detachSleepAudioElement,
  getOrCreateSleepAudioElement,
  updateSleepMediaSession,
} from "@/lib/bible/sleepMediaSession";
import { getBrowserProfile } from "@/lib/bible/sleepVoices";
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export type ReaderAudioStatus = "idle" | "loading" | "playing" | "paused";

export function useReaderAudio(reference: string, passage: Passage | null | undefined) {
  const online = useOnlineStatus();
  const audioHolder = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlsRef = useRef<string[]>([]);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const usingBrowserRef = useRef(false);
  const statusRef = useRef<ReaderAudioStatus>("idle");
  const [status, setStatus] = useState<ReaderAudioStatus>("idle");
  const [playbackRate, setPlaybackRateState] = useState(1);

  const setStatusBoth = useCallback((s: ReaderAudioStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const revokeUrls = useCallback(() => {
    urlsRef.current.forEach(URL.revokeObjectURL);
    urlsRef.current = [];
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    detachSleepAudioElement(audioHolder);
    stopBrowserTts();
    revokeUrls();
    usingBrowserRef.current = false;
    chunkIndexRef.current = 0;
    clearSleepMediaSession();
    setStatusBoth("idle");
  }, [revokeUrls, setStatusBoth]);

  useEffect(() => stop, [reference, stop]);

  const playChunkAudio = useCallback(
    async (index: number) => {
      const text = chunksRef.current[index];
      if (!text) {
        stop();
        return;
      }

      if (online) {
        try {
          const blob = await fetchSleepAudio(text);
          const url = URL.createObjectURL(blob);
          urlsRef.current.push(url);
          const audio = getOrCreateSleepAudioElement(audioHolder);
          audioRef.current = audio;
          audio.src = url;
          audio.playbackRate = playbackRate;
          audio.onended = () => {
            chunkIndexRef.current += 1;
            if (chunkIndexRef.current < chunksRef.current.length) {
              void playChunkAudio(chunkIndexRef.current);
            } else {
              stop();
            }
          };
          audio.onerror = () => {
            stop();
            toast({ variant: "destructive", title: "Playback failed" });
          };
          bindSleepMediaSession(audio, {
            title: reference,
            subtitle: `Part ${index + 1} of ${chunksRef.current.length}`,
            setId: reference,
          });
          await audio.play();
          usingBrowserRef.current = false;
          setStatusBoth("playing");
          updateSleepMediaSession(
            { title: reference, subtitle: reference, setId: reference },
            "playing",
          );
          return;
        } catch {
          /* fall through to browser TTS */
        }
      }

      if (!isBrowserTtsSupported()) {
        toast({
          variant: "destructive",
          title: "Audio unavailable",
          description: online ? "Could not load audio." : "Connect to the internet or use browser speech.",
        });
        stop();
        return;
      }

      usingBrowserRef.current = true;
      setStatusBoth("playing");
      const signal = abortRef.current?.signal ?? new AbortController().signal;
      try {
        await speakBrowserTts(text, getBrowserProfile("female-soft"), signal);
        if (signal.aborted) return;
        chunkIndexRef.current += 1;
        if (chunkIndexRef.current < chunksRef.current.length) {
          await playChunkAudio(chunkIndexRef.current);
        } else {
          stop();
        }
      } catch {
        stop();
      }
    },
    [online, playbackRate, reference, stop, setStatusBoth],
  );

  const toggle = useCallback(async () => {
    if (statusRef.current === "playing") {
      if (usingBrowserRef.current) pauseBrowserTts();
      else audioRef.current?.pause();
      setStatusBoth("paused");
      updateSleepMediaSession(
        { title: reference, subtitle: reference, setId: reference },
        "paused",
      );
      return;
    }

    if (statusRef.current === "paused") {
      if (usingBrowserRef.current) {
        resumeBrowserTts();
      } else {
        await audioRef.current?.play();
      }
      setStatusBoth("playing");
      updateSleepMediaSession(
        { title: reference, subtitle: reference, setId: reference },
        "playing",
      );
      return;
    }

    if (!passage?.verses?.length) {
      toast({ variant: "destructive", title: "Chapter not loaded yet" });
      return;
    }

    setStatusBoth("loading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    chunksRef.current = buildScriptureChunks(passage.verses, reference);
    chunkIndexRef.current = 0;
    try {
      await playChunkAudio(0);
    } catch (err) {
      console.error(err);
      stop();
      toast({
        variant: "destructive",
        title: "Could not play audio",
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  }, [passage, playChunkAudio, reference, stop, setStatusBoth]);

  const cycleSpeed = useCallback(() => {
    setPlaybackRateState((r) => {
      const next = r >= 1.5 ? 0.85 : r >= 1.25 ? 1.5 : r >= 1 ? 1.25 : 1;
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  }, []);

  return {
    playing: status === "playing",
    paused: status === "paused",
    loading: status === "loading",
    status,
    toggle,
    stop,
    cycleSpeed,
    playbackRate,
    disabled: false,
  };
}
