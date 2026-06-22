import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mergeInlineTags } from "@/lib/journal/inlineMarkers";
import {
  clearComposeEntryDraft,
  composeDraftStorageKey,
  hasMeaningfulComposeContent,
  loadComposeEntryDraft,
  saveComposeEntryDraft,
} from "@/lib/journal/composeEntryDraft";
import type { JournalEntryKind } from "@/lib/journal/entryKinds";
import {
  buildFlushPayload,
  mergePendingPatches,
  type JournalAutosavePatch,
} from "@/lib/journal/journalEntryAutosave";
import { maybeEncryptJournalPayload } from "@/lib/journal/journalEntryCrypto";
import type { ListeningSections } from "@/lib/journal/listeningEntry";

export type ComposePersistenceSnapshot = {
  title: string;
  body: string;
  tags: string[];
  mood: number | null;
  entryKind: JournalEntryKind | null;
  journalId: string | null;
  verseRef: string;
  beliefId: string;
  promptId: string | null;
  locationName: string;
  lat: number | null;
  lng: number | null;
  weather: string | null;
  weatherTempC: number | null;
  weatherIcon: string | null;
  analyzeForMirror: boolean;
  entryAt: string;
  listeningSections?: ListeningSections;
};

type UseJournalComposePersistenceOpts = {
  userId: string | undefined;
  editId: string | undefined;
  inlineEntryId: string | null;
  setInlineEntryId: (id: string) => void;
  entryKind: JournalEntryKind | null;
  isListening: boolean;
  getSnapshot: () => ComposePersistenceSnapshot;
  /** Skip local restore when loading an existing entry from the server. */
  skipLocalRestore?: boolean;
};

const LOCAL_DEBOUNCE_MS = 250;
const SERVER_DEBOUNCE_MS = 600;

export function useJournalComposePersistence({
  userId,
  editId,
  inlineEntryId,
  setInlineEntryId,
  entryKind,
  isListening,
  getSnapshot,
  skipLocalRestore = false,
}: UseJournalComposePersistenceOpts) {
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  const draftKeyRef = useRef<string | null>(null);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingServerRef = useRef<JournalAutosavePatch>({});
  const serverGenerationRef = useRef(0);
  const ensuringDraftRef = useRef(false);
  const restoredLocalRef = useRef(false);

  const serverEntryId = editId ?? inlineEntryId ?? null;

  useEffect(() => {
    if (!userId) {
      draftKeyRef.current = null;
      return;
    }
    draftKeyRef.current = composeDraftStorageKey(userId, editId, entryKind);
  }, [userId, editId, entryKind]);

  const persistLocalDraft = useCallback(() => {
    const key = draftKeyRef.current;
    if (!key) return;
    const snap = getSnapshotRef.current();
    saveComposeEntryDraft(key, {
      title: snap.title,
      body: snap.body,
      tags: snap.tags,
      listeningSections: isListening ? snap.listeningSections : undefined,
      entryKind: snap.entryKind,
    });
  }, [isListening]);

  const scheduleLocalDraft = useCallback(() => {
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(() => {
      localTimerRef.current = null;
      persistLocalDraft();
    }, LOCAL_DEBOUNCE_MS);
  }, [persistLocalDraft]);

  const buildServerPayload = useCallback((snap: ComposePersistenceSnapshot): JournalAutosavePatch => {
    const ts = new Date(snap.entryAt);
    return {
      journal_id: snap.journalId,
      title: snap.title.trim() || null,
      body: snap.body,
      mood: snap.mood,
      tags: mergeInlineTags(snap.body, snap.tags),
      verse_ref: snap.verseRef.trim() || null,
      belief_id: snap.beliefId || null,
      prompt_id: snap.promptId,
      location_name: snap.locationName.trim() || null,
      lat: snap.lat,
      lng: snap.lng,
      weather: snap.weather,
      weather_temp_c: snap.weatherTempC,
      weather_icon: snap.weatherIcon,
      analyze_for_mirror: snap.entryKind === "vent" ? false : snap.analyzeForMirror,
      entry_at_ts: ts.toISOString(),
      entry_at: ts.toISOString().slice(0, 10),
      entry_kind: snap.entryKind,
    };
  }, []);

  const flushServerSave = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userId) return;
      if (serverTimerRef.current) {
        clearTimeout(serverTimerRef.current);
        serverTimerRef.current = null;
      }

      const entryId = editId ?? inlineEntryId;
      if (!entryId) return;

      const pending = pendingServerRef.current;
      if (Object.keys(pending).length === 0) return;

      pendingServerRef.current = {};
      serverGenerationRef.current += 1;

      const snap = getSnapshotRef.current();
      let payload: Record<string, unknown>;
      try {
        payload = await maybeEncryptJournalPayload(
          buildFlushPayload(pending, buildServerPayload(snap)),
          { journalId: snap.journalId },
        );
      } catch (err) {
        pendingServerRef.current = mergePendingPatches(pendingServerRef.current, pending);
        if (!opts?.silent) {
          toast({
            title: "Couldn't save entry",
            description: err instanceof Error ? err.message : "Journal encryption required",
            variant: "destructive",
          });
        }
        return;
      }

      const { error } = await supabase
        .from("journal_entries")
        .update(payload)
        .eq("id", entryId)
        .eq("user_id", userId);

      if (error && !opts?.silent) {
        toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
      }
    },
    [userId, editId, inlineEntryId, buildServerPayload],
  );

  const ensureDraftEntry = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;
    if (editId) return editId;
    if (inlineEntryId) return inlineEntryId;
    if (ensuringDraftRef.current) return null;

    const snap = getSnapshotRef.current();
    if (!hasMeaningfulComposeContent(snap)) return null;

    ensuringDraftRef.current = true;
    try {
      let payload: Record<string, unknown>;
      try {
        payload = await maybeEncryptJournalPayload(buildServerPayload(snap), {
          journalId: snap.journalId,
        });
      } catch (err) {
        toast({
          title: "Couldn't create entry",
          description: err instanceof Error ? err.message : "Journal encryption required",
          variant: "destructive",
        });
        return null;
      }
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({ ...payload, user_id: userId })
        .select("id")
        .maybeSingle();

      if (error || !data?.id) {
        if (error) {
          toast({
            title: "Couldn't back up entry",
            description: error.message,
            variant: "destructive",
          });
        }
        return null;
      }

      setInlineEntryId(data.id);
      const newKey = composeDraftStorageKey(userId, data.id, entryKind);
      clearComposeEntryDraft(composeDraftStorageKey(userId, undefined, entryKind));
      draftKeyRef.current = newKey;
      return data.id;
    } finally {
      ensuringDraftRef.current = false;
    }
  }, [userId, editId, inlineEntryId, setInlineEntryId, buildServerPayload, entryKind]);

  const scheduleServerSave = useCallback(() => {
    if (!userId) return;

    const snap = getSnapshotRef.current();
    if (!hasMeaningfulComposeContent(snap)) return;

    scheduleLocalDraft();

    pendingServerRef.current = mergePendingPatches(
      pendingServerRef.current,
      buildServerPayload(snap),
    );

    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    const generation = ++serverGenerationRef.current;

    serverTimerRef.current = setTimeout(async () => {
      if (generation !== serverGenerationRef.current) return;

      let entryId = editId ?? inlineEntryId;
      if (!entryId) {
        entryId = await ensureDraftEntry();
        if (!entryId) return;
      }

      const pending = { ...pendingServerRef.current };
      pendingServerRef.current = {};
      const latestSnap = getSnapshotRef.current();
      const payload = buildFlushPayload(pending, buildServerPayload(latestSnap));

      const { error } = await supabase
        .from("journal_entries")
        .update(payload)
        .eq("id", entryId)
        .eq("user_id", userId);

      if (generation !== serverGenerationRef.current) return;
      if (error) {
        pendingServerRef.current = mergePendingPatches(pendingServerRef.current, pending);
        toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
      }
    }, SERVER_DEBOUNCE_MS);
  }, [
    userId,
    editId,
    inlineEntryId,
    scheduleLocalDraft,
    buildServerPayload,
    ensureDraftEntry,
  ]);

  const restoreLocalDraft = useCallback(() => {
    if (restoredLocalRef.current || skipLocalRestore || editId) return;
    const key = draftKeyRef.current;
    if (!key) return;
    restoredLocalRef.current = true;

    const draft = loadComposeEntryDraft(key);
    if (!draft) return;
    if (!draft.body.trim() && !draft.title.trim()) return;

    return draft;
  }, [skipLocalRestore, editId]);

  const clearDraft = useCallback(() => {
    const key = draftKeyRef.current;
    if (key) clearComposeEntryDraft(key);
    if (userId && !editId) {
      clearComposeEntryDraft(composeDraftStorageKey(userId, undefined, entryKind));
    }
  }, [userId, editId, entryKind]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        persistLocalDraft();
        void flushServerSave({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [persistLocalDraft, flushServerSave]);

  useEffect(() => {
    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      persistLocalDraft();
      void flushServerSave({ silent: true });
    };
  }, [persistLocalDraft, flushServerSave]);

  return {
    schedulePersist: scheduleServerSave,
    flushServerSave,
    restoreLocalDraft,
    clearDraft,
  };
}
