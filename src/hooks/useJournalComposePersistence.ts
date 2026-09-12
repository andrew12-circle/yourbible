import { useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { mergeInlineTags } from "@/lib/journal/inlineMarkers";
import { composeDraftStorageKey, loadComposeEntryDraft, clearComposeEntryDraft, hasMeaningfulComposeContent } from "@/lib/journal/composeEntryDraft";
import type { JournalEntryKind } from "@/lib/journal/entryKinds";
import type { ListeningSections } from "@/lib/journal/listeningEntry";
import { localDateKey } from "@/lib/journal/localDate";
import { createLocalJournalDocument, openJournalDocument, patchJournalDocument, flushJournalDocument, registerJournalEditorSync, peekJournalDocument, JOURNAL_DOCUMENT_CHANGED } from "@/lib/journal/journalDocuments";
import { journalChangedFields, journalValueEqual, type JournalValues, type JournalFlushResult, type JournalSaveQueue } from "@/lib/journal/journalSaveQueue";
import type { JournalEntryRecord } from "@/lib/journal/journalEntryDb";

export type ComposePersistenceSnapshot = {
  title: string; body: string; summary?: string; tags: string[]; mood: number | null;
  entryKind: JournalEntryKind | null; journalId: string | null; verseRef: string; beliefId: string;
  promptId: string | null; locationName: string; lat: number | null; lng: number | null;
  weather: string | null; weatherTempC: number | null; weatherIcon: string | null;
  analyzeForMirror: boolean; entryAt: string; listeningSections?: ListeningSections;
};
type Options = {
  userId: string | undefined; editId: string | undefined; inlineEntryId: string | null;
  setInlineEntryId: (id: string) => void; entryKind: JournalEntryKind | null; isListening: boolean;
  getSnapshot: () => ComposePersistenceSnapshot;
  enabled?: boolean;
  onDocumentChange?: (patch: JournalValues) => void;
  /** Kept for API compatibility. Existing-entry recovery is now revision-aware. */
  skipLocalRestore?: boolean;
};
function payloadFor(snap: ComposePersistenceSnapshot): JournalValues {
  const date = new Date(snap.entryAt);
  if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid entry date before saving.");
  return {
    journal_id: snap.journalId, title: snap.title.trim() || null, body: snap.body,
    summary: snap.summary?.trim() || null, mood: snap.mood, tags: mergeInlineTags(snap.body, snap.tags),
    verse_ref: snap.verseRef.trim() || null, belief_id: snap.beliefId || null, prompt_id: snap.promptId,
    location_name: snap.locationName.trim() || null, lat: snap.lat, lng: snap.lng,
    weather: snap.weather, weather_temp_c: snap.weatherTempC, weather_icon: snap.weatherIcon,
    analyze_for_mirror: snap.entryKind === "vent" ? false : snap.analyzeForMirror,
    entry_at_ts: date.toISOString(), entry_at: localDateKey(date), entry_kind: snap.entryKind,
  };
}
const pointerKey = (userId: string) => `yb_journal_compose_identity_v2:${userId}`;

export function useJournalComposePersistence(options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const identityRef = useRef(options.editId ?? options.inlineEntryId);
  const observedUiRef = useRef<JournalValues | null>(null);
  const initializedRef = useRef(!options.editId);
  const finishedRef = useRef(false);
  const restoredRef = useRef(false);
  const generationRef = useRef(0);
  const scopeRef = useRef(`${options.userId}:${options.editId ?? "new"}`);
  const scope = `${options.userId}:${options.editId ?? "new"}`;
  if (scopeRef.current !== scope) {
    scopeRef.current = scope;
    identityRef.current = options.editId ?? options.inlineEntryId;
    observedUiRef.current = null;
    initializedRef.current = !options.editId;
    finishedRef.current = false;
    restoredRef.current = false;
    generationRef.current += 1;
  }

  const initialize = useCallback((row: JournalEntryRecord) => {
    if (row.contentLocked) throw new Error("Unlock your journal before editing.");
    identityRef.current = row.id;
    initializedRef.current = true;
    // The next fully hydrated render establishes the UI baseline without saving its
    // formatted date or chat-summary presentation back over the stored document.
    observedUiRef.current = null;
  }, []);

  const getQueue = useCallback(async (snapshot: ComposePersistenceSnapshot): Promise<JournalSaveQueue> => {
    const current = optionsRef.current;
    if (!current.userId) throw new Error("Sign in before saving your journal.");
    if (!initializedRef.current) throw new Error("Wait for this entry to finish opening.");
    let id = current.editId ?? identityRef.current ?? current.inlineEntryId;
    if (!id) {
      id = crypto.randomUUID();
      identityRef.current = id; // Synchronous, before any await or React state update.
      try { sessionStorage.setItem(pointerKey(current.userId), id); } catch { /* The durable entry draft still owns its identity. */ }
      const queue = createLocalJournalDocument(current.userId, id, payloadFor(snapshot));
      current.setInlineEntryId(id);
      return queue;
    }
    identityRef.current = id;
    return openJournalDocument(current.userId, id);
  }, []);

  const synchronize = useCallback((queue: JournalSaveQueue, snapshot: ComposePersistenceSnapshot) => {
    const values = payloadFor(snapshot);
    const observed = observedUiRef.current;
    observedUiRef.current = values;
    if (observed) {
      const patch = journalChangedFields(observed, values);
      if (Object.keys(patch).length) patchJournalDocument(queue.current().userId, queue.current().id, patch);
    }
    observedUiRef.current = values;
  }, []);

  const schedulePersist = useCallback(() => {
    const current = optionsRef.current;
    if (!current.userId || !initializedRef.current || finishedRef.current || current.enabled === false) return;
    const snapshot = current.getSnapshot();
    if (!identityRef.current && !hasMeaningfulComposeContent(snapshot)) return;
    const generation = ++generationRef.current;
    const ownerScope = scopeRef.current;
    void getQueue(snapshot).then((queue) => {
      if (generation !== generationRef.current || ownerScope !== scopeRef.current) return;
      synchronize(queue, snapshot);
      // Both editors delegate debounce and acknowledgement to the same owner.
      if (queue.isDirty()) patchJournalDocument(queue.current().userId, queue.current().id, {});
    }).catch((error: unknown) => {
      toast({ title: "Journal save paused", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    });
  }, [getQueue, synchronize]);

  const flushServerSave = useCallback(async (opts?: { silent?: boolean; patch?: JournalValues }): Promise<JournalFlushResult> => {
    const current = optionsRef.current;
    const userId = current.userId;
    const ownerScope = scopeRef.current;
    if (!userId) return { ok: false, entryId: identityRef.current ?? "", error: new Error("Sign in before saving.") };
    if (finishedRef.current) return flushJournalDocument(userId, identityRef.current!);
    const snapshot = current.getSnapshot();
    generationRef.current += 1;
    try {
      const queue = await getQueue(snapshot);
      if (ownerScope !== scopeRef.current) return queue.flush();
      // A later user edit may have arrived during hydration; always capture it before flushing.
      if (optionsRef.current.enabled !== false) synchronize(queue, optionsRef.current.getSnapshot());
      if (opts?.patch) queue.patch(opts.patch);
      const result = await queue.flush();
      if (!result.ok && !opts?.silent) toast({ title: "Entry not saved to the cloud", description: result.error.message, variant: "destructive" });
      return result;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (!opts?.silent) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return { ok: false, entryId: identityRef.current ?? "", error };
    }
  }, [getQueue, synchronize]);

  const ensureEntry = useCallback(async (): Promise<string | null> => {
    const result = await flushServerSave();
    return result.ok ? result.entryId : null;
  }, [flushServerSave]);

  const restoreLocalDraft = useCallback(async () => {
    const current = optionsRef.current;
    if (current.editId || !current.userId || restoredRef.current) return null;
    restoredRef.current = true;
    // A verse/prompt explicitly supplied by the caller is a new document, not an
    // instruction to overwrite the last unfinished entry.
    if (hasMeaningfulComposeContent(current.getSnapshot())) return null;
    let id: string | null = null;
    try { id = sessionStorage.getItem(pointerKey(current.userId)); } catch { /* fall back to legacy recovery */ }
    if (id) {
      const queue = await openJournalDocument(current.userId, id);
      identityRef.current = id;
      current.setInlineEntryId(id);
      const values = queue.current().values;
      return {
        title: String(values.title ?? ""), body: String(values.body ?? ""),
        tags: (values.tags ?? []) as string[], entryKind: (values.entry_kind ?? null) as JournalEntryKind | null,
        listeningSections: undefined, values,
      };
    }
    // A legacy new-entry draft has no server identity; importing it creates a new
    // revisioned document. Existing-entry legacy drafts are never auto-overwritten.
    const legacy = loadComposeEntryDraft(composeDraftStorageKey(current.userId, undefined, current.entryKind));
    return legacy ? { ...legacy, values: undefined } : null;
  }, []);

  const clearDraft = useCallback(() => {
    const current = optionsRef.current;
    finishedRef.current = true;
    if (current.userId && !current.editId) {
      try { sessionStorage.removeItem(pointerKey(current.userId)); } catch { /* no journal content is removed here */ }
      clearComposeEntryDraft(composeDraftStorageKey(current.userId, undefined, current.entryKind));
    }
    // Only the write owner clears its exact acknowledged IndexedDB snapshot.
  }, []);

  useEffect(() => {
    const userId = options.userId;
    const id = options.editId ?? options.inlineEntryId;
    if (!userId || !id) return;
    const sync = () => {
      const current = optionsRef.current;
      const queue = peekJournalDocument(userId, id);
      if (current.enabled !== false && initializedRef.current && !finishedRef.current && queue) synchronize(queue, current.getSnapshot());
    };
    const unsubscribe = registerJournalEditorSync(userId, id, sync);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; entryId: string }>).detail;
      if (detail?.userId !== userId || detail.entryId !== id || optionsRef.current.enabled === false || !observedUiRef.current) return;
      const queue = peekJournalDocument(userId, id);
      if (!queue) return;
      const view = payloadFor(optionsRef.current.getSnapshot());
      const documentValues = queue.current().values;
      const applied: JournalValues = {};
      for (const key of ["title", "summary", "body", "tags"]) {
        if (journalValueEqual(view[key], observedUiRef.current[key]) && !journalValueEqual(view[key], documentValues[key])) applied[key] = documentValues[key];
      }
      if (Object.keys(applied).length) {
        observedUiRef.current = { ...observedUiRef.current, ...applied };
        optionsRef.current.onDocumentChange?.(applied);
      }
    };
    window.addEventListener(JOURNAL_DOCUMENT_CHANGED, onChange);
    return () => { unsubscribe(); window.removeEventListener(JOURNAL_DOCUMENT_CHANGED, onChange); };
  }, [options.userId, options.editId, options.inlineEntryId, synchronize]);

  const flushRef = useRef(flushServerSave);
  flushRef.current = flushServerSave;
  useEffect(() => {
    const flush = () => {
      if (!finishedRef.current && initializedRef.current && identityRef.current && optionsRef.current.enabled !== false) void flushRef.current({ silent: true });
    };
    const hidden = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return { schedulePersist, flushServerSave, restoreLocalDraft, clearDraft, initialize, ensureEntry };
}
