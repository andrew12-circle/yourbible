import { useCallback, useRef, useState } from "react";
import { formatDictationForJournal } from "@/lib/ai/formatDictatedTextLocally";

type Options = {
  getBody: () => string;
  setBody: (next: string) => void;
  /** Skip formatting (e.g. vent space). */
  enabled?: boolean;
  /** Minimum characters before formatting. */
  minChars?: number;
};

/** After dictation stops, format speech locally (no AI — safe for encrypted journals). */
export function useDictationAutoFormat({
  getBody,
  setBody,
  enabled = true,
  minChars = 30,
}: Options) {
  const [formatting, setFormatting] = useState(false);
  const wasListeningRef = useRef(false);
  const getBodyRef = useRef(getBody);
  const setBodyRef = useRef(setBody);
  getBodyRef.current = getBody;
  setBodyRef.current = setBody;

  const onListeningChange = useCallback(
    (listening: boolean) => {
      const wasListening = wasListeningRef.current;
      wasListeningRef.current = listening;
      if (!enabled || wasListening === listening || listening) return;

      const body = getBodyRef.current().trim();
      if (body.length < minChars) return;

      setFormatting(true);
      try {
        const formatted = formatDictationForJournal(body);
        if (formatted.trim() && formatted !== body) {
          setBodyRef.current(formatted);
        }
      } finally {
        setFormatting(false);
      }
    },
    [enabled, minChars],
  );

  return { onListeningChange, formatting };
}
