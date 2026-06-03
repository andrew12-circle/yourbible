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
} from "@/lib/journal/floatingJournalDraft";
import {
  appendJournalTimestampToNotes,
  buildJournalTimestampInsert,
  composeJournalNotesWithTimestampBlocks,
  extractJournalTimestampBlocks,
  parseJournalTimestampMarkers,
  stripJournalTimestampBlocks,
} from "@/lib/journal/artifactJournalTimestamps";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import {
  composeArtifactJournalBody,
  hasArtifactJournalSourceContent,
  splitArtifactJournalBody,
  type ArtifactJournalSourceInput,
} from "@/lib/journal/artifactJournalEntrySource";
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
  channel?: string | null;
  channelUrl?: string | null;
  author?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  providerName?: string | null;
  getPlaybackSeconds?: () => number | null;
  transcriptSegments?: TranscriptSegment[];
  onSeekPlayback?: (seconds: number) => void;
  expanded?: boolean;
};

export function useArtifactJournalEditor({
  userId,
  artifactId,
  artifactTitle,
  artifactKind = "text",
  channel,
  channelUrl,
  author,
  thumbnailUrl,
  youTubeVideoId,
  providerName,
  getPlaybackSeconds,
  transcriptSegments = [],
  onSeekPlayback,
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

  const defaultEntryTitle = artifactTitle?.trim() ?? "";

  const buildSourceInput = useCallback(
    (entryTitle?: string): ArtifactJournalSourceInput => ({
      entryTitle: (entryTitle ?? title).trim() || defaultEntryTitle || null,
      channel,
      channelUrl,
      author,
      thumbnailUrl,
      youTubeVideoId,
      providerName,
    }),
    [
      author,
      channel,
      channelUrl,
      defaultEntryTitle,
      providerName,
      thumbnailUrl,
      title,
      youTubeVideoId,
    ],
  );

  const composeBodyForSave = useCallback(
    (notes: string, entryTitle?: string) => composeArtifactJournalBody(notes, buildSourceInput(entryTitle)),
    [buildSourceInput],
  );

  const persistEntrySourceBody = useCallback(
    async (targetId: string, notes: string) => {
      const composed = composeBodyForSave(notes);
      const entryTitle = title.trim() || defaultEntryTitle || null;
      await supabase
        .from("journal_entries")
        .update({ body: composed, title: entryTitle })
        .eq("id", targetId)
        .eq("user_id", userId);
    },
    [composeBodyForSave, defaultEntryTitle, title, userId],
  );

  useLayoutEffect(() => {
    try {
      const d = localStorage.getItem(draftKey);
      if (d) {
        const j = JSON.parse(d) as { title?: string; body?: string; notes?: string };
        const rawNotes = typeof j.notes === "string" ? j.notes : j.body ?? "";
        const { notes } = splitArtifactJournalBody(rawNotes);
        setBody(notes);
        const draftTitle = typeof j.title === "string" ? j.title.trim() : "";
        setTitle(draftTitle || defaultEntryTitle);
      } else {
        setTitle(defaultEntryTitle);
      }
    } catch {
      setTitle(defaultEntryTitle);
    }
  }, [draftKey, defaultEntryTitle]);

  useEffect(() => {
    if (!defaultEntryTitle) return;
    setTitle((current) => (current.trim() ? current : defaultEntryTitle));
  }, [defaultEntryTitle]);

  useEffect(() => {
    let cancelled = false;
    linkedEntryLoadedRef.current = false;
    (async () => {
      const linked = await fetchLatestArtifactJournalEntry(userId, artifactId);
      if (cancelled) return;
      linkedEntryLoadedRef.current = true;
      if (!linked) return;
      setEntryId(linked.id);
      const savedTitle = (linked.title ?? "").trim();
      setTitle(savedTitle || defaultEntryTitle);
      const { notes } = splitArtifactJournalBody(linked.body ?? "");
      setBody(notes);
      const sketch = await fetchEntrySketchPhoto(userId, linked.id);
      if (!cancelled && sketch?.url) setSavedSketchUrl(sketch.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, artifactId, defaultEntryTitle]);

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
        title: title.trim() || defaultEntryTitle || null,
        body: composeBodyForSave(body),
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
  }, [artifactKind, body, composeBodyForSave, defaultEntryTitle, title, userId]);

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
        await persistEntrySourceBody(targetId, body);
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
    [body, clearPendingSketch, ensureLinkedEntry, persistEntrySourceBody, setSketchOpen, userId],
  );

  const handleSketchAutosave = useCallback(
    async (file: File) => {
      const targetId = entryId ?? (await ensureLinkedEntry());
      if (!targetId) return;
      try {
        await upsertEntrySketchPhoto(userId, targetId, file);
        await persistEntrySourceBody(targetId, body);
        const sketch = await fetchEntrySketchPhoto(userId, targetId);
        if (sketch?.url) setSavedSketchUrl(sketch.url);
      } catch (err) {
        console.warn("artifact sketch autosave failed", err);
      }
    },
    [body, ensureLinkedEntry, entryId, persistEntrySourceBody, userId],
  );

  const startNewHandwritePage = useCallback(() => {
    clearSketchDraft(sketchDraftKey);
    clearPendingSketch();
    setEntryId(null);
    setSavedSketchUrl(null);
    setTitle(defaultEntryTitle);
    setBody("");
    setSketchOpen(true);
    toast({
      title: "New page",
      description: "Save the entry when you're ready to keep this page in your journal.",
    });
  }, [clearPendingSketch, defaultEntryTitle, setSketchOpen, sketchDraftKey]);

  useEffect(() => {
    floatingJournalInsertRef.current = {
      artifactId,
      append: (markdown: string) => {
        const ta = textareaRef.current;
        const focused = ta && document.activeElement === ta;
        const s = focused ? ta.selectionStart : null;
        const e = focused ? ta.selectionEnd : null;
        setBody((prev) => {
          const blocks = extractJournalTimestampBlocks(prev);
          const user = stripJournalTimestampBlocks(prev);
          let nextUser: string;
          if (s != null && e != null) {
            nextUser = `${user.slice(0, s)}${markdown}${user.slice(e)}`;
            const pos = s + markdown.length;
            requestAnimationFrame(() => {
              const el = textareaRef.current;
              if (!el) return;
              el.focus();
              el.setSelectionRange(pos, pos);
            });
          } else {
            const sep =
              user.length === 0 ? "" : user.endsWith("\n\n") ? "" : user.endsWith("\n") ? "\n" : "\n\n";
            nextUser = `${user}${sep}${markdown}`;
            requestAnimationFrame(() => {
              const el = textareaRef.current;
              if (!el) return;
              el.focus();
              const pos = nextUser.length;
              el.setSelectionRange(pos, pos);
            });
          }
          return composeJournalNotesWithTimestampBlocks(nextUser, blocks);
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
        localStorage.setItem(draftKey, JSON.stringify({ title, notes: body }));
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

  const timestampMarkers = useMemo(() => parseJournalTimestampMarkers(body), [body]);

  const editorNotes = useMemo(() => stripJournalTimestampBlocks(body), [body]);

  const setEditorNotes = useCallback((next: string | ((prev: string) => string)) => {
    setBody((prev) => {
      const blocks = extractJournalTimestampBlocks(prev);
      const user = typeof next === "function" ? next(stripJournalTimestampBlocks(prev)) : next;
      return composeJournalNotesWithTimestampBlocks(user, blocks);
    });
  }, []);

  const appendEditorNotes = useCallback((markdown: string) => {
    setBody((prev) => {
      const blocks = extractJournalTimestampBlocks(prev);
      const user = stripJournalTimestampBlocks(prev);
      const sep =
        user.length === 0 ? "" : user.endsWith("\n\n") ? "" : user.endsWith("\n") ? "\n" : "\n\n";
      return composeJournalNotesWithTimestampBlocks(`${user}${sep}${markdown}`, blocks);
    });
  }, []);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const min = expanded ? 200 : 120;
    const next = Math.min(Math.max(el.scrollHeight, min), autosizeMax);
    el.style.height = `${next}px`;
  }, [editorNotes, expanded, autosizeMax]);

  const persistDraftNow = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, notes: body }));
    } catch {
      /* ignore */
    }
  }, [draftKey, title, body]);

  const insertTimestamp = useCallback(() => {
    if (!getPlaybackSeconds) return;
    const sec = getPlaybackSeconds();
    if (sec == null || !Number.isFinite(sec)) {
      toast({ title: "Playback time unavailable", variant: "destructive" });
      return;
    }
    const block = buildJournalTimestampInsert(sec, transcriptSegments);
    setBody((b) => appendJournalTimestampToNotes(b, block));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = el.value.length;
      el.setSelectionRange(pos, pos);
    });
  }, [getPlaybackSeconds, transcriptSegments]);

  const seekToTimestamp = useCallback(
    (seconds: number) => {
      onSeekPlayback?.(Math.max(0, Math.floor(seconds)));
    },
    [onSeekPlayback],
  );

  const saveEntry = useCallback(async () => {
    const hasSource = hasArtifactJournalSourceContent(buildSourceInput());
    if (
      !editorNotes.trim() &&
      !timestampMarkers.length &&
      !title.trim() &&
      !hasPendingSketch &&
      !entryId &&
      !hasSource &&
      !savedSketchUrl
    ) {
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
          onBody: (nextBody) => setBody(splitArtifactJournalBody(nextBody).notes),
          onTitle: (nextTitle) => setTitle(nextTitle),
        });
        const sketch = await fetchEntrySketchPhoto(userId, savedId);
        if (sketch?.url) setSavedSketchUrl(sketch.url);
      }

      toast({ title: wasUpdate ? "Journal entry updated" : "Journal entry saved" });
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, notes: body }));
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
    buildSourceInput,
    entryId,
    hasPendingSketch,
    savedSketchUrl,
    editorNotes,
    timestampMarkers,
    title,
    userId,
  ]);

  const showTimestamp = typeof getPlaybackSeconds === "function";

  return {
    title,
    setTitle,
    body,
    editorNotes,
    setEditorNotes,
    appendEditorNotes,
    saving,
    dateLine,
    textareaRef,
    dictateRef,
    insertTimestamp,
    seekToTimestamp,
    timestampMarkers,
    saveEntry,
    persistDraftNow,
    showTimestamp,
    defaultTitlePlaceholder: defaultEntryTitle || undefined,
    journalDisplayTitle: title.trim() || defaultEntryTitle || "Journal",
    showJournalPageHeader:
      hasArtifactJournalSourceContent(buildSourceInput()) || Boolean(defaultEntryTitle),
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
