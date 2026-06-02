import { useCallback, useRef } from "react";

const AUTOSAVE_MS = 1800;
const DRAFT_SAVE_MS = 400;

export function useSketchPadPersistence(opts: {
  draftKey?: string;
  filename?: string;
  onAutosave?: (file: File) => void | Promise<void>;
  exportPng: () => Promise<File | null>;
  persistDraft: () => void;
  hasStrokes: () => boolean;
}) {
  const { draftKey, onAutosave, exportPng, persistDraft, hasStrokes } = opts;
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavingRef = useRef(false);

  const flushAutosave = useCallback(async () => {
    if (!onAutosave || autosavingRef.current || !hasStrokes()) return;
    const file = await exportPng();
    if (!file) return;
    autosavingRef.current = true;
    try {
      await onAutosave(file);
    } catch (err) {
      console.warn("sketch autosave failed", err);
    } finally {
      autosavingRef.current = false;
    }
  }, [exportPng, hasStrokes, onAutosave]);

  const queueAutosave = useCallback(() => {
    if (!onAutosave) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushAutosave();
    }, AUTOSAVE_MS);
  }, [flushAutosave, onAutosave]);

  const queueDraftSave = useCallback(() => {
    if (!draftKey) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      persistDraft();
    }, DRAFT_SAVE_MS);
  }, [draftKey, persistDraft]);

  const notifyStrokeChange = useCallback(() => {
    queueDraftSave();
    queueAutosave();
  }, [queueAutosave, queueDraftSave]);

  const clearTimers = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  return {
    notifyStrokeChange,
    flushAutosave,
    clearTimers,
    draftTimerRef,
  };
}

export { AUTOSAVE_MS, DRAFT_SAVE_MS };
