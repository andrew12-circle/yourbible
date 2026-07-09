import { useEffect, useRef, useState } from "react";
import { frequencyBinsToWaveformLevels, MIC_WAVEFORM_BAR_COUNT } from "@/hooks/useMicWaveform";

const IDLE_LEVEL = 0.12;
const LIVE_BAR_COUNT = 12;

/** Live waveform bars from an existing MediaStream (no extra getUserMedia). */
export function useMicWaveformFromStream(stream: MediaStream | null, active: boolean): number[] {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: LIVE_BAR_COUNT }, () => IDLE_LEVEL),
  );
  const rafRef = useRef<number | null>(null);

  const audioTrackId = stream?.getAudioTracks()[0]?.id ?? null;

  useEffect(() => {
    if (!stream || !active) {
      setLevels(Array.from({ length: LIVE_BAR_COUNT }, () => IDLE_LEVEL));
      return;
    }

    const track = stream.getAudioTracks()[0];
    if (!track) {
      setLevels(Array.from({ length: LIVE_BAR_COUNT }, () => IDLE_LEVEL));
      return;
    }

    let ctx: AudioContext | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          const full = frequencyBinsToWaveformLevels(data, MIC_WAVEFORM_BAR_COUNT);
          const step = Math.max(1, Math.floor(full.length / LIVE_BAR_COUNT));
          const sampled = Array.from({ length: LIVE_BAR_COUNT }, (_, i) => full[i * step] ?? IDLE_LEVEL);
          setLevels(sampled);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLevels(Array.from({ length: LIVE_BAR_COUNT }, () => IDLE_LEVEL));
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      void ctx?.close();
    };
  }, [stream, active, audioTrackId]);

  return levels;
}
