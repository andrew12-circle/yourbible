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

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  item?: (index: number) => { transcript: string } | undefined;
  0?: { transcript: string };
};

type RecognitionResultList = {
  length: number;
  item?: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
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

export function mapSpeechError(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Allow microphone access for this site in your browser settings, then tap the mic again.";
    case "no-speech":
      return "Didn't catch that — try again";
    case "audio-capture":
      return "No microphone was found. Check that a mic is connected and not in use by another app.";
    case "network":
      return "Live speech recognition is unavailable. Try Chrome or Edge, check your connection, and allow microphone access.";
    case "aborted":
      return "Dictation was interrupted.";
    case "service-not-allowed":
      return "Live dictation needs Chrome, Edge, or Safari on a secure (HTTPS) connection.";
    default:
      return "Voice dictation hit a snag — try Chrome or Edge and allow microphone access.";
  }
}

/** Benign Web Speech errors — restart silently, no toast. */
export function isTransientSpeechError(code: string): boolean {
  return code === "aborted" || code === "no-speech" || code === "network";
}

export function isSpeechErrorToastWorthy(message: string): boolean {
  if (/didn't catch that/i.test(message)) return false;
  if (/interrupted|paused — tap/i.test(message)) return false;
  return true;
}

function resultTranscript(r: SpeechRecognitionResult): string {
  try {
    if (typeof r.item === "function") return r.item(0)?.transcript ?? "";
  } catch {
    /* fall through */
  }
  return r[0]?.transcript ?? "";
}

function parseResults(ev: SpeechResultEvent): { finals: string[]; interim: string } {
  const finals: string[] = [];
  let interim = "";
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const r = ev.results[i];
    const t = resultTranscript(r);
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

  const scheduleRestart = useCallback(
    (bindRec: (rec: RecInstance) => void, delayMs = 250) => {
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
          rapidFailRef.current = 0;
        } catch {
          bumpRapidFail();
          if (rapidFailRef.current >= 4) {
            desiredRef.current = false;
            setListening(false);
            setError(mapSpeechError("network"));
            onInterimRef.current?.("");
            return;
          }
          scheduleRestart(bindRec, Math.min(delayMs * 2, 1200));
        }
      }, delayMs);
    },
    [language, bumpRapidFail],
  );

  const beginRecognition = useCallback(() => {
    if (!Ctor) return;
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
        if (finals.length) {
          setError(null);
          rapidFailRef.current = 0;
        }
      };

      rec.onerror = (ev: Event) => {
        const code = (ev as SpeechErrorEvent).error || "unknown";
        if (isTransientSpeechError(code)) return;

        bumpRapidFail();
        if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
          setError(mapSpeechError(code));
          desiredRef.current = false;
          setListening(false);
          return;
        }

        if (rapidFailRef.current >= 3) {
          setError(mapSpeechError(code));
          if (rapidFailRef.current >= 6) {
            desiredRef.current = false;
            setListening(false);
          }
        }
      };

      rec.onend = () => {
        if (!desiredRef.current) return;
        if (rapidFailRef.current >= 6) {
          desiredRef.current = false;
          setListening(false);
          setError(mapSpeechError("network"));
          onInterimRef.current?.("");
          return;
        }
        scheduleRestart(bindRec);
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
      setError(mapSpeechError("service-not-allowed"));
    }
  }, [Ctor, language, bumpRapidFail, scheduleRestart]);

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    desiredRef.current = true;
    rapidFailRef.current = 0;

    void (async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {
          if (!desiredRef.current) return;
          if (e instanceof DOMException && e.name === "NotAllowedError") {
            setError(mapSpeechError("not-allowed"));
            desiredRef.current = false;
            setListening(false);
            return;
          }
          if (e instanceof DOMException && e.name === "NotFoundError") {
            setError(mapSpeechError("audio-capture"));
            desiredRef.current = false;
            setListening(false);
            return;
          }
        }
      }
      if (!desiredRef.current) return;
      beginRecognition();
    })();
  }, [Ctor, beginRecognition]);

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
