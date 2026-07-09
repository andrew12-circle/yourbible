import { useEffect, useRef } from "react";

type Options = {
  enabled: boolean;
  level: number;
  /** Seconds of quiet before auto-pause. */
  silenceSeconds?: number;
  threshold?: number;
  onSilence: () => void;
};

/** Pause recording after sustained low mic level. */
export function useSilenceAutoPause({
  enabled,
  level,
  silenceSeconds = 30,
  threshold = 0.04,
  onSilence,
}: Options): void {
  const quietSinceRef = useRef<number | null>(null);
  const levelRef = useRef(level);
  const onSilenceRef = useRef(onSilence);
  levelRef.current = level;
  onSilenceRef.current = onSilence;

  useEffect(() => {
    if (!enabled) {
      quietSinceRef.current = null;
      return;
    }

    const id = window.setInterval(() => {
      const now = Date.now();
      const currentLevel = levelRef.current;
      if (currentLevel > threshold) {
        quietSinceRef.current = null;
        return;
      }
      if (quietSinceRef.current == null) {
        quietSinceRef.current = now;
        return;
      }
      if (now - quietSinceRef.current >= silenceSeconds * 1000) {
        quietSinceRef.current = null;
        onSilenceRef.current();
      }
    }, 400);

    return () => window.clearInterval(id);
  }, [enabled, silenceSeconds, threshold]);
}
