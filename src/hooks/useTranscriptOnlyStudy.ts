import { useCallback, useEffect, useRef, useState } from "react";
import { buildTranscriptOnlyStudy, LOCAL_STUDY_MAX_CHARS, type TranscriptOnlyStudy } from "@/lib/framework/transcriptOnlyStudy";

type Snapshot = { artifactId: string; text: string; result?: TranscriptOnlyStudy; error?: string };

/** In-memory, source-scoped work only. No model downloads, API requests, storage, or status writes. */
export function useTranscriptOnlyStudy(artifactId: string, text: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  useEffect(() => {
    if (!enabled || !text.trim()) return;
    const id = ++request.current;
    let cancelled = false;
    let settled = false;
    let fallbackStarted = false;
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    setSnapshot(null);
    const finish = (value: Pick<Snapshot, "result" | "error">) => {
      if (cancelled || settled || request.current !== id) return;
      settled = true;
      clearTimeout(deadline); worker?.terminate();
      setSnapshot({ artifactId, text, ...value });
    };
    const fallback = () => {
      if (fallbackStarted || settled || cancelled) return;
      fallbackStarted = true;
      worker?.terminate();
      // Avoid freezing video on a device without workers. Large sources remain readable.
      if (text.length > 100_000 && text.length <= LOCAL_STUDY_MAX_CHARS) {
        finish({ error: "This browser cannot scan a large transcript locally. Reading, search, and notes still work." });
        return;
      }
      timer = setTimeout(() => {
        try { finish({ result: buildTranscriptOnlyStudy(text) }); }
        catch { finish({ error: "Local excerpt selection could not finish. Your transcript is still available." }); }
      }, 0);
    };
    try {
      if (text.length > LOCAL_STUDY_MAX_CHARS) finish({ result: buildTranscriptOnlyStudy(text) });
      else if (typeof Worker === "undefined") fallback();
      else {
        worker = new Worker(new URL("../lib/framework/transcriptOnlyStudy.worker.ts", import.meta.url), { type: "module" });
        worker.onmessage = (event: MessageEvent<{ id: number; result?: TranscriptOnlyStudy; error?: string }>) => {
          if (event.data.id !== id) return;
          finish(event.data.result ? { result: event.data.result } : { error: event.data.error ?? "Local scan failed." });
        };
        worker.onerror = event => { event.preventDefault(); clearTimeout(deadline); fallback(); };
        worker.postMessage({ id, text });
        deadline = setTimeout(() => finish({ error: "Local excerpt selection timed out. Your transcript is still available." }), 12_000);
      }
    } catch { fallback(); }
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(deadline); worker?.terminate(); };
  }, [artifactId, text, enabled, attempt]);
  const current = enabled && snapshot?.artifactId === artifactId && snapshot.text === text ? snapshot : null;
  return { result: current?.result, error: current?.error, pending: enabled && Boolean(text.trim()) && !current, retry };
}
