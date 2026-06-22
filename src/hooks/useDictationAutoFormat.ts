import { useCallback, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatDictatedTextWithFallback } from "@/lib/ai/formatDictatedText";

type Options = {
  getBody: () => string;
  setBody: (next: string) => void;
  /** Skip formatting (e.g. vent space). */
  enabled?: boolean;
  /** Minimum characters before calling the formatter. */
  minChars?: number;
};

/** After dictation stops, run AI formatting so raw speech becomes readable prose. */
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

      void (async () => {
        setFormatting(true);
        try {
          const { text: formatted, usedFallback } = await formatDictatedTextWithFallback(body);
          if (formatted.trim() && formatted !== body) {
            setBodyRef.current(formatted);
          }
          if (usedFallback) {
            toast({
              title: "Basic formatting applied",
              description:
                "AI formatting was unavailable — applied punctuation breaks locally. Redeploy ai-text-polish for full cleanup.",
            });
          }
        } catch (err) {
          toast({
            title: "Couldn't format dictation",
            description:
              err instanceof Error
                ? err.message
                : "Your words are saved — tap the wand to polish manually.",
            variant: "destructive",
          });
        } finally {
          setFormatting(false);
        }
      })();
    },
    [enabled, minChars],
  );

  return { onListeningChange, formatting };
}
