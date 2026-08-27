import { useEffect } from "react";

/** Funnel browser background/freeze and return events into the recorder state machine. */
export function useJournalVideoPageLifecycle(onHidden: () => void, onReturn: () => void): void {
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHidden();
      else onReturn();
    };
    window.addEventListener("pagehide", onHidden, { capture: true });
    window.addEventListener("pageshow", onReturn, { capture: true });
    document.addEventListener("visibilitychange", onVisibility, { capture: true });
    document.addEventListener("freeze", onHidden, { capture: true });
    document.addEventListener("resume", onReturn, { capture: true });
    return () => {
      window.removeEventListener("pagehide", onHidden, { capture: true });
      window.removeEventListener("pageshow", onReturn, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility, { capture: true });
      document.removeEventListener("freeze", onHidden, { capture: true });
      document.removeEventListener("resume", onReturn, { capture: true });
    };
  }, [onHidden, onReturn]);
}
