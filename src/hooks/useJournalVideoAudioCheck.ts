import { useCallback, useState } from "react";

/** Tracks whether the user has finished the pre-recording mic check (manual continue only). */
export function useJournalVideoAudioCheck() {
  const [passed, setPassed] = useState(false);

  const reset = useCallback(() => {
    setPassed(false);
  }, []);

  const markPassed = useCallback(() => {
    setPassed(true);
  }, []);

  return { passed, markPassed, reset };
}
