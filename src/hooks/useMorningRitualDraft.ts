import { useEffect, useRef } from "react";
import {
  clearMorningRitualDraft,
  loadMorningRitualDraft,
  resolveDraftStepIndex,
  saveMorningRitualDraft,
  type MorningRitualDraftInput,
} from "@/lib/livingHope/morningRitualDraft";

const SAVE_DEBOUNCE_MS = 400;

export function useMorningRitualDraftPersistence(
  userId: string | undefined,
  input: MorningRitualDraftInput | null,
  opts?: { enabled?: boolean; onRestore?: (draft: ReturnType<typeof loadMorningRitualDraft>) => void },
) {
  const restored = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || restored.current || !opts?.onRestore) return;
    const draft = loadMorningRitualDraft(userId);
    if (!draft) {
      restored.current = true;
      return;
    }
    opts.onRestore(draft);
    restored.current = true;
  }, [userId, opts?.onRestore]);

  useEffect(() => {
    if (!userId || !input || opts?.enabled === false) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      saveMorningRitualDraft(userId, input);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [userId, input, opts?.enabled]);
}

export function clearMorningRitualDraftForUser(userId: string | undefined): void {
  if (!userId) return;
  clearMorningRitualDraft(userId);
}

export { resolveDraftStepIndex, loadMorningRitualDraft };
