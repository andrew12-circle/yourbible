import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveJournalCaptionPreview, type JournalCaptionSnapshot } from "@/lib/journal/journalCaptionPreview";

/** Recorder captions are view state. Durable recording recovery and finalization
 * remain the only writers of speech into the canonical journal document. */
export function useJournalCaptionPreview(owner: string | null, body: string, enabled: boolean) {
  const latest = useRef({ owner, enabled });
  latest.current = { owner, enabled };
  const [session, setSession] = useState<(JournalCaptionSnapshot & { owner: string }) | null>(null);
  const active = useRef<typeof session>(null);
  const serial = useRef(0);
  const start = useCallback((original: string, anchor: number) => {
    if (!owner || latest.current.owner !== owner || !latest.current.enabled) return;
    const next = { owner, id: `${owner}:${++serial.current}`, body: original, anchor, text: "" };
    active.current = next;
    setSession(next);
  }, [owner]);
  const update = useCallback((text: string) => {
    if (!owner || latest.current.owner !== owner || !latest.current.enabled || active.current?.owner !== owner) return;
    const next = { ...active.current, text };
    active.current = next;
    setSession(next);
  }, [owner]);
  const clear = useCallback(() => {
    if (active.current?.owner !== owner) return;
    active.current = null;
    setSession(null);
  }, [owner]);
  useEffect(() => {
    if (!enabled || active.current?.owner !== owner) {
      active.current = null;
      setSession(null);
    }
  }, [owner, enabled]);
  const preview = useMemo(() => enabled && owner && session?.owner === owner
    ? resolveJournalCaptionPreview(body, session) : null, [body, enabled, owner, session]);
  return { preview, start, update, clear };
}
