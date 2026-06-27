import { useEffect, useRef, useState } from "react";

/** Normalized mic level 0–1 from an active MediaStream. */
export function useMicLevel(stream: MediaStream | null, active: boolean): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      setLevel(0);
      return;
    }
    const track = stream.getAudioTracks()[0];
    if (!track) {
      setLevel(0);
      return;
    }

    let ctx: AudioContext | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) sum += data[i];
          const avg = sum / data.length / 255;
          setLevel(avg);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLevel(0);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      void ctx?.close();
    };
  }, [stream, active]);

  return level;
}
