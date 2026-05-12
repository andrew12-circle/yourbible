import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechDictationOptions {
  /** Append fully-finalized chunks to whatever the textarea currently has. */
  onAppend: (chunk: string) => void;
  /** Live partial transcript (replaces the prior partial). */
  onInterim?: (partial: string) => void;
  language?: string;
}

export interface UseSpeechDictationApi {
  supported: boolean;
  listening: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

type RecognitionResultList = {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
};

type SpeechResultEvent = Event & {
  resultIndex: number;
  results: RecognitionResultList;
};

type SpeechErrorEvent = Event & {
  error: string;
};

type RecInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => RecInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecInstance;
    webkitSpeechRecognition?: new () => RecInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechDictationSupported = (): boolean => getSpeechRecognitionCtor() !== null;

function mapSpeechError(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Microphone permission was blocked. Enable the microphone for this site in your browser settings.";
    case "no-speech":
      return "Didn't catch that — try again";
    case "audio-capture":
      return "No microphone was found or it could not be opened.";
    case "network":
      return "Network error — check your connection and try again.";
    case "aborted":
      return "Dictation was interrupted.";
    case "service-not-allowed":
      return "Speech recognition isn't available (service not allowed).";
    default:
      return "Voice dictation hit a snag — try again";
  }
}

function parseResults(ev: SpeechResultEvent): { finals: string[]; interim: string } {
  const finals: string[] = [];
  let interim = "";
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const r = ev.results[i];
    const t = r[0]?.transcript ?? "";
    if (r.isFinal) finals.push(t);
    else interim += t;
  }
  return { finals, interim };
}

/** Append a finalized speech chunk to a journal-style body (end only, spacing rules). */
export function mergeDictatedText(currentBody: string, chunkFromHook: string): string {
  const addition = chunkFromHook.trim();
  if (!addition) return currentBody;
  if (!currentBody) return addition;
  return /\s$/.test(currentBody) ? currentBody + addition : `${currentBody} ${addition}`;
}

export function useSpeechDictation(options: UseSpeechDictationOptions): UseSpeechDictationApi {
  const { onAppend, onInterim, language = "en-US" } = options;
  const onAppendRef = useRef(onAppend);
  const onInterimRef = useRef(onInterim);
  onAppendRef.current = onAppend;
  onInterimRef.current = onInterim;

  const Ctor = getSpeechRecognitionCtor();
  const supported = Ctor !== null;

  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<RecInstance | null>(null);
  const desiredRef = useRef(false);
  const rapidFailRef = useRef(0);
  const rapidFailResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpRapidFail = useCallback(() => {
    rapidFailRef.current += 1;
    if (rapidFailResetTimerRef.current) clearTimeout(rapidFailResetTimerRef.current);
    rapidFailResetTimerRef.current = setTimeout(() => {
      rapidFailRef.current = 0;
      rapidFailResetTimerRef.current = null;
    }, 8000);
  }, []);

  const teardownInstance = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const stopInternal = useCallback(
    (opts?: { clearInterim?: boolean }) => {
      desiredRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      setListening(false);
      teardownInstance();
      if (opts?.clearInterim !== false) onInterimRef.current?.("");
    },
    [teardownInstance],
  );

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    desiredRef.current = true;
    rapidFailRef.current = 0;

    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }

    const bindRec = (rec: RecInstance) => {
      rec.onresult = (ev: Event) => {
        const { finals, interim } = parseResults(ev as SpeechResultEvent);
        for (const f of finals) {
          const chunk = f.trim();
          if (chunk) onAppendRef.current(`${chunk} `);
        }
        onInterimRef.current?.(interim);
        if (finals.length) setError(null);
      };

      rec.onerror = (ev: Event) => {
        const code = (ev as SpeechErrorEvent).error || "unknown";
        if (code === "aborted") return;

        if (code === "no-speech") {
          bumpRapidFail();
          return;
        }

        setError(mapSpeechError(code));
        bumpRapidFail();
        if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
          desiredRef.current = false;
          setListening(false);
        }
      };

      rec.onend = () => {
        if (!desiredRef.current) return;
        if (rapidFailRef.current >= 5) {
          desiredRef.current = false;
          setListening(false);
          setError("Dictation stopped after repeated errors. Try again in a moment.");
          onInterimRef.current?.("");
          return;
        }
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (!desiredRef.current) return;
          const NextCtor = getSpeechRecognitionCtor();
          if (!NextCtor) {
            desiredRef.current = false;
            setListening(false);
            return;
          }
          try {
            const next = new NextCtor();
            next.continuous = true;
            next.interimResults = true;
            next.lang = language;
            recRef.current = next;
            bindRec(next);
            next.start();
          } catch {
            desiredRef.current = false;
            setListening(false);
          }
        }, 120);
      };
    };

    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language;
      recRef.current = rec;
      bindRec(rec);
      rec.start();
      setListening(true);
    } catch {
      desiredRef.current = false;
      setListening(false);
      setError("Could not start voice dictation.");
    }
  }, [Ctor, language, bumpRapidFail]);

  const stop = useCallback(() => {
    stopInternal({ clearInterim: true });
  }, [stopInternal]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (desiredRef.current) stop();
    else start();
  }, [supported, start, stop]);

  useEffect(() => {
    return () => {
      desiredRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (rapidFailResetTimerRef.current) clearTimeout(rapidFailResetTimerRef.current);
      teardownInstance();
    };
  }, [teardownInstance]);

  return { supported, listening, error, start, stop, toggle };
}
