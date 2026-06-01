import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import {
  floatingJournalDraftStorageKey,
  formatJournalPlaybackTimestamp,
} from "@/lib/journal/floatingJournalDraft";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import type { DictateButtonHandle } from "@/components/journal/DictateButton";

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

  useLayoutEffect(() => {
    try {
      const d = localStorage.getItem(draftKey);
      if (d) {
        const j = JSON.parse(d) as { title?: string; body?: string };
        if (typeof j.body === "string") setBody(j.body);
        if (typeof j.title === "string") setTitle(j.title);
      }
    } catch {
      /* ignore */
    }
  }, [draftKey]);

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
    const saveTags = artifactKind === "youtube" ? ["artifact", "youtube"] : ["artifact"];
    if (!body.trim() && !title.trim()) {
      toast({ title: "Write something first", variant: "destructive" });
      return;
    }
    dictateRef.current?.stop();
    setSaving(true);
    try {
      const journalId = await getDefaultJournalId(userId);
      const ctx = await getCurrentContext();
      const ts = new Date();
      const payload = {
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
      };

      const { data, error } = await supabase.from("journal_entries").insert(payload).select("id").maybeSingle();
      if (error || !data?.id) {
        toast({ title: "Save failed", description: error?.message, variant: "destructive" });
        return;
      }
      const entryId = data.id;
      const { error: linkErr } = await supabase.from("journal_entry_links").insert({
        user_id: userId,
        entry_id: entryId,
        target_kind: "artifact",
        target_ref: { id: artifactId },
      });
      if (linkErr) {
        toast({ title: "Entry saved; link failed", description: linkErr.message, variant: "destructive" });
      } else {
        toast({ title: "Journal entry saved" });
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    } finally {
      setSaving(false);
    }
  }, [artifactId, artifactKind, body, draftKey, title, userId]);

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
  };
}
