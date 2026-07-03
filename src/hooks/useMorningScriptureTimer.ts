import { useCallback, useEffect, useState } from "react";
import {
  getMorningScriptureElapsedMs,
  pauseMorningScriptureTimer,
  startMorningScriptureTimer,
} from "@/lib/livingHope/morningScriptureTimer";
import { GUIDED_SCRIPTURE_MS, scriptureReadingComplete } from "@/lib/livingHope/morningGuidedRitual";

export function useMorningScriptureTimer(active: boolean, targetMs = GUIDED_SCRIPTURE_MS) {
  const [elapsedMs, setElapsedMs] = useState(() => getMorningScriptureElapsedMs());

  const refresh = useCallback(() => {
    setElapsedMs(getMorningScriptureElapsedMs());
  }, []);

  useEffect(() => {
    if (!active) {
      pauseMorningScriptureTimer();
      refresh();
      return;
    }
    startMorningScriptureTimer();
    refresh();
    const id = window.setInterval(refresh, 1000);
    return () => {
      window.clearInterval(id);
      pauseMorningScriptureTimer();
      refresh();
    };
  }, [active, refresh]);

  return {
    elapsedMs,
    targetMs,
    complete: scriptureReadingComplete(elapsedMs, targetMs),
    progress: targetMs > 0 ? Math.min(1, elapsedMs / targetMs) : 1,
  };
}