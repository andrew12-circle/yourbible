import { useCallback, useRef, useState } from "react";
import { formatDictationForJournal } from "@/lib/ai/formatDictatedTextLocally";

type Options = {
  getBody: () => string;
  setBody: (next: string) => void;
  /** Skip formatting (e.g. vent space). */
  enabled?: boolean;
  /** Minimum characters before formatting. */
  minChars?: number;
  /** Called after dictation stops and formatting finishes (e.g. refocus the editor). */
  onFormatted?: () => void;
};

/** After dictation stops, format speech locally (no AI — safe for encrypted journals). */
export function useDictationAutoFormat({
  getBody,
  setBody,
  enabled = true,
  minChars = 8,
  onFormatted,
}: Options) {
  const [formatting, setFormatting] = useState(false);
  const wasListeningRef = useRef(false);
  const getBodyRef = useRef(getBody);
  const setBodyRef = useRef(setBody);
  const onFormattedRef = useRef(onFormatted);
  getBodyRef.current = getBody;
  setBodyRef.current = setBody;
  onFormattedRef.current = onFormatted;

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
        onFormattedRef.current?.();
      }
    },
    [enabled, minChars],
  );

  return { onListeningChange, formatting };
}
