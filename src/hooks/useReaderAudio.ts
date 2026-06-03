import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSleepAudio, passagePlainText, type Passage } from "@/lib/bible/api";
import { toast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const MAX_TTS_CHARS = 12000;

export function useReaderAudio(reference: string, passage: Passage | null | undefined) {
  const online = useOnlineStatus();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
    }
    audioRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop, reference]);

  const toggle = useCallback(async () => {
    if (playing) {
      stop();
      return;
    }

    if (!online) {
      toast({
        variant: "destructive",
        title: "Audio unavailable offline",
        description: "Connect to the internet to listen to this chapter.",
      });
      return;
    }

    if (!passage?.verses?.length) {
      toast({ variant: "destructive", title: "Chapter not loaded yet" });
      return;
    }

    setLoading(true);
    try {
      const text = `${reference}. ${passagePlainText(passage)}`.slice(0, MAX_TTS_CHARS);
      const blob = await fetchSleepAudio(text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        stop();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        stop();
        toast({ variant: "destructive", title: "Playback failed" });
      };
      await audio.play();
      setPlaying(true);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Could not play audio",
        description: err instanceof Error ? err.message : "Try again later.",
      });
    } finally {
      setLoading(false);
    }
  }, [online, passage, playing, reference, stop]);

  return { playing, loading, toggle, stop, disabled: !online };
}
