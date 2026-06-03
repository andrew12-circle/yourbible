import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  fetchEntrySketchPhoto,
  fetchLatestArtifactJournalEntry,
} from "@/lib/journal/artifactJournalEntry";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import {
  floatingJournalDraftStorageKey,
  formatJournalPlaybackTimestamp,
} from "@/lib/journal/floatingJournalDraft";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { clearSketchDraft } from "@/lib/journal/sketchDraft";
import { upsertEntrySketchPhoto } from "@/lib/journal/sketchPhotos";
import type { DictateButtonHandle } from "@/components/journal/DictateButton";
import { usePendingJournalSketch } from "@/hooks/usePendingJournalSketch";

const TEXTAREA_AUTOSIZE_MAX_DOCKED = 360;
const TEXTAREA_AUTOSIZE_MAX_EXPANDED = 720;

export type UseArtifactJournalEditorOptions = {
  userId: string;
  artifactId: string;
  artifactTitle?: string;
  artifactKind?: string;
  getPlaybackSeconds?: () => number | null;
  expanded?: boolean;
};

export function useArtifactJournalEditor({
  userId,
  artifactId,
  artifactTitle,
  artifactKind = "text",
  getPlaybackSeconds,
  expanded = false,
}: UseArtifactJournalEditorOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftDebounceRef = useRef<number | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [savedSketchUrl, setSavedSketchUrl] = useState<string | null>(null);
  const linkedEntryLoadedRef = useRef(false);
  const {
    sketchOpen,
    setSketchOpen,
    previewUrl,
    hasPendingSketch,
    handleSketchSave,
    clearPendingSketch,
    attachSketchToEntry,
  } = usePendingJournalSketch();

  const dateLine = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const draftKey = floatingJournalDraftStorageKey(userId, artifactId);
  const sketchDraftKey = `artifact:${artifactId}`;

  useLayoutEffect(() => {
    try {
      const d = localStorage.getItem(draftKey);
      if (d) {
        const j = JSON.parse(d) as { title?: string; body?: string };
        if (typeof j.body === "string") setBody(j.body);
        if (typeof j.title === "string" && j.title.trim()) {
          setTitle(j.title.trim());
        }
      } else if (artifactTitle?.trim()) {
        setTitle(artifactTitle.trim());
      }
    } catch {
      if (artifactTitle?.trim()) setTitle(artifactTitle.trim());
    }
  }, [draftKey, artifactTitle]);

  useEffect(() => {
    let cancelled = false;
    linkedEntryLoadedRef.current = false;
    (async () => {
      const linked = await fetchLatestArtifactJournalEntry(userId, artifactId);
      if (cancelled) return;
      linkedEntryLoadedRef.current = true;
      if (!linked) return;
      setEntryId(linked.id);
      setTitle(linked.title ?? "");
      setBody(linked.body ?? "");
      const sketch = await fetchEntrySketchPhoto(userId, linked.id);
      if (!cancelled && sketch?.url) setSavedSketchUrl(sketch.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, artifactId]);

  const buildEntryPayload = useCallback(async () => {
    const journalId = await getDefaultJournalId(userId);
    const ctx = await getCurrentContext();
    const ts = new Date();
    const saveTags = artifactKind === "youtube" ? ["artifact", "youtube"] : ["artifact"];
    return {
      journalId,
      ts,
      saveTags,
      row: {
        user_id: userId,
        journal_id: journalId,
        title: title.trim() || null,
        body,
        mood: null as number | null,
        tags: saveTags,
        verse_ref: null as string | null,
        belief_id: null as string | null,
        prompt_id: null as string | null,
        location_name: ctx.location_name?.trim() || null,
        lat: ctx.lat,
        lng: ctx.lng,
        weather: ctx.weather,
        weather_temp_c: ctx.weather_temp_c,
        weather_icon: ctx.weather_icon,
        analyze_for_mirror: false,
        entry_at_ts: ts.toISOString(),
        entry_at: ts.toISOString().slice(0, 10),
      },
    };
  }, [artifactKind, body, title, userId]);

  const ensureLinkedEntry = useCallback(async (): Promise<string | null> => {
    if (entryId) return entryId;
    const { row } = await buildEntryPayload();
    const { data, error } = await supabase
      .from("journal_entries")
      .insert(row)
      .select("id")
      .maybeSingle();
    if (error || !data?.id) {
      toast({ title: "Couldn't start journal page", description: error?.message, variant: "destructive" });
      return null;
    }
    const newId = data.id;
    const { error: linkErr } = await supabase.from("journal_entry_links").insert({
      user_id: userId,
      entry_id: newId,
      target_kind: "artifact",
      target_ref: { id: artifactId },
    });
    if (linkErr) {
      toast({ title: "Page started; link failed", description: linkErr.message, variant: "destructive" });
    }
    setEntryId(newId);
    return newId;
  }, [artifactId, buildEntryPayload, entryId, userId]);

  const handleArtifactSketchSave = useCallback(
    async (file: File) => {
      const targetId = await ensureLinkedEntry();
      if (!targetId) return;
      try {
        await upsertEntrySketchPhoto(userId, targetId, file);
        const sketch = await fetchEntrySketchPhoto(userId, targetId);
        if (sketch?.url) setSavedSketchUrl(sketch.url);
        clearPendingSketch();
        toast({
          title: "Handwriting saved",
          description: "Your strokes are still here — keep drawing or switch to the keyboard.",
        });
      } catch (err) {
        toast({
          title: "Couldn't save handwriting",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
        return;
      }
      setSketchOpen(false);
    },
    [clearPendingSketch, ensureLinkedEntry, setSketchOpen, userId],
  );

  const handleSketchAutosave = useCallback(
    async (file: File) => {
      const targetId = entryId ?? (await ensureLinkedEntry());
      if (!targetId) return;
      try {
        await upsertEntrySketchPhoto(userId, targetId, file);
        const sketch = await fetchEntrySketchPhoto(userId, targetId);
        if (sketch?.url) setSavedSketchUrl(sketch.url);
      } catch (err) {
        console.warn("artifact sketch autosave failed", err);
      }
    },
    [ensureLinkedEntry, entryId, userId],
  );

  const startNewHandwritePage = useCallback(() => {
    clearSketchDraft(sketchDraftKey);
    clearPendingSketch();
    setEntryId(null);
    setSavedSketchUrl(null);
    setTitle(artifactTitle?.trim() ?? "");
    setBody("");
    setSketchOpen(true);
    toast({
      title: "New page",
      description: "Save the entry when you're ready to keep this page in your journal.",
    });
  }, [artifactTitle, clearPendingSketch, setSketchOpen, sketchDraftKey]);

  useEffect(() => {
    floatingJournalInsertRef.current = {
      artifactId,
      append: (markdown: string) => {
        const ta = textareaRef.current;
        const focused = ta && document.activeElement === ta;
        const s = focused ? ta.selectionStart : null;
        const e = focused ? ta.selectionEnd : null;
        setBody((prev) => {
          if (s != null && e != null) {
            const next = `${prev.slice(0, s)}${markdown}${prev.slice(e)}`;
            const pos = s + markdown.length;
            requestAnimationFrame(() => {
              const el = textareaRef.current;
              if (!el) return;
              el.focus();
              el.setSelectionRange(pos, pos);
            });
            return next;
          }
          const sep =
            prev.length === 0 ? "" : prev.endsWith("\n\n") ? "" : prev.endsWith("\n") ? "\n" : "\n\n";
          const next = `${prev}${sep}${markdown}`;
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (!el) return;
            el.focus();
            const pos = next.length;
            el.setSelectionRange(pos, pos);
          });
          return next;
        });
      },
    };
    return () => {
      if (floatingJournalInsertRef.current?.artifactId === artifactId) {
        floatingJournalInsertRef.current = null;
      }
    };
  }, [artifactId]);

  useEffect(() => {
    if (draftDebounceRef.current) window.clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, body }));
      } catch {
        /* ignore */
      }
    }, 350);
    return () => {
      if (draftDebounceRef.current) window.clearTimeout(draftDebounceRef.current);
    };
  }, [title, body, draftKey]);

  useEffect(() => {
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, []);

  const autosizeMax = expanded ? TEXTAREA_AUTOSIZE_MAX_EXPANDED : TEXTAREA_AUTOSIZE_MAX_DOCKED;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const min = expanded ? 200 : 120;
    const next = Math.min(Math.max(el.scrollHeight, min), autosizeMax);
    el.style.height = `${next}px`;
  }, [body, expanded, autosizeMax]);

  const persistDraftNow = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, body }));
    } catch {
      /* ignore */
    }
  }, [draftKey, title, body]);

  const insertTimestamp = useCallback(() => {
    const ta = textareaRef.current;
    if (!getPlaybackSeconds) return;
    const sec = getPlaybackSeconds();
    if (sec == null || !Number.isFinite(sec)) {
      toast({ title: "Playback time unavailable", variant: "destructive" });
      return;
    }
    const stamp = `[${formatJournalPlaybackTimestamp(sec)}]`;
    if (!ta) {
      setBody((b) => `${b}${b && !b.endsWith("\n") ? "\n" : ""}${stamp}`);
      return;
    }
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    setBody((prev) => `${prev.slice(0, s)}${stamp}${prev.slice(e)}`);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = s + stamp.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }, [getPlaybackSeconds]);

  const saveEntry = useCallback(async () => {
    if (!body.trim() && !title.trim() && !hasPendingSketch && !entryId) {
      toast({ title: "Write something first", variant: "destructive" });
      return;
    }
    dictateRef.current?.stop();
    setSaving(true);
    const wasUpdate = Boolean(entryId);
    try {
      const { row } = await buildEntryPayload();
      let savedId = entryId;

      if (savedId) {
        const { error } = await supabase
          .from("journal_entries")
          .update({
            title: row.title,
            body: row.body,
            location_name: row.location_name,
            lat: row.lat,
            lng: row.lng,
            weather: row.weather,
            weather_temp_c: row.weather_temp_c,
            weather_icon: row.weather_icon,
          })
          .eq("id", savedId)
          .eq("user_id", userId);
        if (error) {
          toast({ title: "Save failed", description: error.message, variant: "destructive" });
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("journal_entries")
          .insert(row)
          .select("id")
          .maybeSingle();
        if (error || !data?.id) {
          toast({ title: "Save failed", description: error?.message, variant: "destructive" });
          return;
        }
        savedId = data.id;
        setEntryId(savedId);
        const { error: linkErr } = await supabase.from("journal_entry_links").insert({
          user_id: userId,
          entry_id: savedId,
          target_kind: "artifact",
          target_ref: { id: artifactId },
        });
        if (linkErr) {
          toast({ title: "Entry saved; link failed", description: linkErr.message, variant: "destructive" });
        }
      }

      if (hasPendingSketch && savedId) {
        await attachSketchToEntry(userId, savedId, {
          onBody: (nextBody) => setBody(nextBody),
          onTitle: (nextTitle) => setTitle(nextTitle),
        });
        const sketch = await fetchEntrySketchPhoto(userId, savedId);
        if (sketch?.url) setSavedSketchUrl(sketch.url);
      }

      toast({ title: wasUpdate ? "Journal entry updated" : "Journal entry saved" });
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, body }));
      } catch {
        /* ignore */
      }
    } finally {
      setSaving(false);
    }
  }, [
    artifactId,
    attachSketchToEntry,
    body,
    buildEntryPayload,
    draftKey,
    entryId,
    hasPendingSketch,
    title,
    userId,
  ]);

  const showTimestamp = typeof getPlaybackSeconds === "function";

  return {
    title,
    setTitle,
    body,
    setBody,
    saving,
    dateLine,
    textareaRef,
    dictateRef,
    insertTimestamp,
    saveEntry,
    persistDraftNow,
    showTimestamp,
    defaultTitlePlaceholder: artifactTitle,
    sketchOpen,
    setSketchOpen,
    previewUrl,
    hasPendingSketch,
    handleSketchSave: handleArtifactSketchSave,
    clearPendingSketch,
    sketchDraftKey,
    savedSketchUrl,
    entryId,
    handleSketchAutosave,
    startNewHandwritePage,
  };
}
