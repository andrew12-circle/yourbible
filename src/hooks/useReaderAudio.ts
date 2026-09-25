import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSleepAudio, type Passage } from "@/lib/bible/api";
import { isBrowserTtsSupported, pauseBrowserTts, resumeBrowserTts, speakBrowserTts, stopBrowserTts } from "@/lib/bible/browserTts";
import { buildScriptureChunks } from "@/lib/bible/scriptureTts";
import { bindSleepMediaSession, clearSleepMediaSession, detachSleepAudioElement, getOrCreateSleepAudioElement, updateSleepMediaSession } from "@/lib/bible/sleepMediaSession";
import { getBrowserProfile } from "@/lib/bible/sleepVoices";
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
export type ReaderAudioStatus = "idle" | "loading" | "playing" | "paused";

export function useReaderAudio(reference: string, passage: Passage | null | undefined) {
  const online = useOnlineStatus();
  const audioHolder = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urls = useRef<string[]>([]);
  const chunks = useRef<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const usingBrowser = useRef(false);
  const statusRef = useRef<ReaderAudioStatus>("idle");
  const rate = useRef(1);
  const [status, setStatus] = useState<ReaderAudioStatus>("idle");
  const [playbackRate, setPlaybackRate] = useState(1);
  const setBoth = useCallback((value: ReaderAudioStatus) => { statusRef.current = value; setStatus(value); }, []);
  const stop = useCallback(() => {
    generation.current++;
    abort.current?.abort(); abort.current = null;
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.onerror = null; audioRef.current.pause(); }
    audioRef.current = null;
    detachSleepAudioElement(audioHolder);
    stopBrowserTts();
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current = [];
    usingBrowser.current = false;
    clearSleepMediaSession(); setBoth("idle");
  }, [setBoth]);
  useEffect(() => stop, [reference, stop]);

  const playChunk = useCallback(async (index: number, session: number, signal: AbortSignal): Promise<void> => {
    const current = () => generation.current === session && !signal.aborted;
    if (!current()) return;
    const text = chunks.current[index];
    if (!text) { stop(); return; }
    setBoth("loading");
    if (online) {
      try {
        const blob = await fetchSleepAudio(text, undefined, signal);
        if (!current()) return;
        const url = URL.createObjectURL(blob); urls.current.push(url);
        const audio = getOrCreateSleepAudioElement(audioHolder);
        audioRef.current = audio; audio.src = url; audio.playbackRate = rate.current;
        audio.onended = () => { if (current()) void playChunk(index + 1, session, signal); };
        audio.onerror = () => { if (current()) { stop(); toast({ variant: "destructive", title: "Playback failed" }); } };
        await audio.play();
        if (!current()) return;
        usingBrowser.current = false; setBoth("playing");
        updateSleepMediaSession({ title: reference, subtitle: reference }, "playing");
        return;
      } catch {
        if (!current()) return;
        audioRef.current?.pause(); audioRef.current = null;
        detachSleepAudioElement(audioHolder);
      }
    }
    if (!isBrowserTtsSupported()) {
      toast({ variant: "destructive", title: "Audio unavailable", description: online ? "Could not load narration." : "Connect to the internet or enable device speech." });
      stop(); return;
    }
    usingBrowser.current = true; setBoth("playing");
    try {
      await speakBrowserTts(text, getBrowserProfile("female-soft"), signal, rate.current);
      if (current()) await playChunk(index + 1, session, signal);
    } catch { if (current()) stop(); }
  }, [online, reference, stop, setBoth]);

  const toggle = useCallback(async () => {
    if (statusRef.current === "loading") return;
    if (statusRef.current === "playing") {
      if (usingBrowser.current) pauseBrowserTts(); else audioRef.current?.pause();
      setBoth("paused"); updateSleepMediaSession({ title: reference, subtitle: reference }, "paused"); return;
    }
    if (statusRef.current === "paused") {
      const session = generation.current;
      try {
        if (usingBrowser.current) resumeBrowserTts(); else await audioRef.current?.play();
        if (session !== generation.current) return;
        setBoth("playing"); updateSleepMediaSession({ title: reference, subtitle: reference }, "playing");
      } catch { if (session === generation.current) { stop(); toast({ variant: "destructive", title: "Could not resume audio" }); } }
      return;
    }
    if (!passage?.verses.length) { toast({ variant: "destructive", title: "Chapter not loaded yet" }); return; }
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    const session = ++generation.current;
    chunks.current = buildScriptureChunks(passage.verses, reference);
    setBoth("loading");
    await playChunk(0, session, controller.signal);
  }, [passage, playChunk, reference, stop, setBoth]);
  // Bind reader media actions.
  useEffect(() => {
    if (status === "idle") return;
    const unbind = bindSleepMediaSession({
      onPlay: () => { if (statusRef.current === "paused") void toggle(); },
      onPause: () => { if (statusRef.current === "playing") void toggle(); },
      onStop: stop,
    });
    updateSleepMediaSession({ title: reference, subtitle: reference, artist: "YourBible" }, status === "playing" ? "playing" : status === "paused" ? "paused" : "none");
    return unbind;
  }, [status, reference, stop, toggle]);

  const cycleSpeed = useCallback(() => {
    const r = rate.current, next = r >= 1.5 ? 0.85 : r >= 1.25 ? 1.5 : r >= 1 ? 1.25 : 1;
    rate.current = next; setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);
  return { playing: status === "playing", paused: status === "paused", loading: status === "loading", status, toggle, stop, cycleSpeed, playbackRate,
    disabled: !passage?.verses.length || (!online && !isBrowserTtsSupported()) };
}
