import { useEffect, useRef, useState } from "react";

export const MIC_WAVEFORM_BAR_COUNT = 28;

const IDLE_LEVEL = 0.12;

/** Frequency-bin samples normalized to 0–1 for a live mic waveform. */
export function frequencyBinsToWaveformLevels(data: Uint8Array, barCount: number): number[] {
  const levels: number[] = [];
  const step = Math.max(1, Math.floor(data.length / barCount));
  for (let i = 0; i < barCount; i += 1) {
    const idx = Math.min(data.length - 1, i * step);
    const normalized = data[idx] / 255;
    levels.push(Math.min(1, normalized * 2.1 + 0.06));
  }
  return levels;
}

/** Live mic waveform levels (0–1 per bar) while `active`. */
export function useMicWaveform(active: boolean): number[] {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: MIC_WAVEFORM_BAR_COUNT }, () => IDLE_LEVEL),
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setLevels(Array.from({ length: MIC_WAVEFORM_BAR_COUNT }, () => IDLE_LEVEL));
      return;
    }

    let cancelled = false;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          setLevels(frequencyBinsToWaveformLevels(data, MIC_WAVEFORM_BAR_COUNT));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!cancelled) {
          setLevels(Array.from({ length: MIC_WAVEFORM_BAR_COUNT }, () => IDLE_LEVEL));
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close();
    };
  }, [active]);

  return levels;
}
