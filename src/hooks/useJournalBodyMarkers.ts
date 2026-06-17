import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listJournals, type Journal } from "@/lib/journal/journals";
import {
  filterJournalSuggestions,
  filterTagSuggestions,
  getActiveInlineMarker,
  mergeInlineTags,
  replaceInlineMarkerToken,
  resolveJournalIdFromBody,
  tagsWithoutInline,
  type ActiveInlineMarker,
  type JournalNameRow,
} from "@/lib/journal/inlineMarkers";
import { toast } from "@/hooks/use-toast";

type UseJournalBodyMarkersOptions = {
  userId: string | undefined;
  body: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  journalId: string | null;
  onJournalIdChange?: (journalId: string | null) => void;
  journals?: Journal[];
  enabled?: boolean;
  /** When false, only powers autocomplete — caller syncs tags/journal on save. */
  syncMetadata?: boolean;
};

export function useJournalBodyMarkers({
  userId,
  body,
  tags,
  onTagsChange,
  journalId,
  onJournalIdChange,
  journals: journalsProp,
  enabled = true,
  syncMetadata = true,
}: UseJournalBodyMarkersOptions) {
  const [loadedJournals, setLoadedJournals] = useState<JournalNameRow[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [activeMarker, setActiveMarker] = useState<ActiveInlineMarker | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const manualTagsRef = useRef<string[]>(tagsWithoutInline(body, tags));
  const lastResolvedJournalRef = useRef<string | null>(journalId);

  const journals = useMemo(
    () => (journalsProp?.map((j) => ({ id: j.id, name: j.name })) ?? loadedJournals),
    [journalsProp, loadedJournals],
  );

  useEffect(() => {
    manualTagsRef.current = tagsWithoutInline(body, tags);
  }, [body, tags]);

  useEffect(() => {
    lastResolvedJournalRef.current = journalId;
  }, [journalId]);

  useEffect(() => {
    if (!enabled || !userId || journalsProp?.length) return;
    void listJournals().then((rows) => {
      setLoadedJournals(rows.map((j) => ({ id: j.id, name: j.name })));
    });
  }, [enabled, userId, journalsProp?.length]);

  useEffect(() => {
    if (!enabled || !userId) return;
    void supabase
      .from("journal_entries")
      .select("tags")
      .eq("user_id", userId)
      .not("tags", "is", null)
      .limit(200)
      .then(({ data }) => {
        const pool = new Set<string>();
        for (const row of data ?? []) {
          for (const t of (row as { tags?: string[] }).tags ?? []) {
            if (typeof t === "string" && t.trim()) pool.add(t.trim().toLowerCase());
          }
        }
        setKnownTags([...pool]);
      });
  }, [enabled, userId]);

  const syncMarkersFromBody = useCallback(
    (nextBody: string) => {
      if (!enabled || !syncMetadata) return;
      const mergedTags = mergeInlineTags(nextBody, manualTagsRef.current);
      if (mergedTags.join("|") !== tags.join("|")) onTagsChange(mergedTags);

      if (!onJournalIdChange || !journals.length) return;
      const resolvedId = resolveJournalIdFromBody(nextBody, journals);
      if (resolvedId && resolvedId !== lastResolvedJournalRef.current) {
        lastResolvedJournalRef.current = resolvedId;
        onJournalIdChange(resolvedId);
        const name = journals.find((j) => j.id === resolvedId)?.name;
        if (name) {
          toast({ title: `Filed under ${name}` });
        }
      }
    },
    [enabled, journals, onJournalIdChange, onTagsChange, syncMetadata, tags],
  );

  const suggestions = useMemo(() => {
    if (!activeMarker) return [] as { id: string; label: string; kind: "journal" | "hashtag" }[];
    if (activeMarker.kind === "journal") {
      return filterJournalSuggestions(activeMarker.query, journals).map((j) => ({
        id: j.id,
        label: j.name,
        kind: "journal" as const,
      }));
    }
    return filterTagSuggestions(activeMarker.query, knownTags).map((t) => ({
      id: t,
      label: t,
      kind: "hashtag" as const,
    }));
  }, [activeMarker, journals, knownTags]);

  useEffect(() => {
    setMenuIndex(0);
  }, [activeMarker?.query, activeMarker?.kind]);

  const updateActiveMarker = useCallback(
    (text: string, cursor: number) => {
      if (!enabled) {
        setActiveMarker(null);
        return;
      }
      setActiveMarker(getActiveInlineMarker(text, cursor));
    },
    [enabled],
  );

  const applySuggestion = useCallback(
    (label: string) => {
      if (!activeMarker) return null;
      return replaceInlineMarkerToken(body, activeMarker, label);
    },
    [activeMarker, body],
  );

  const pickSuggestion = useCallback(
    (label: string) => {
      const next = applySuggestion(label);
      if (!next) return null;
      syncMarkersFromBody(next.text);
      setActiveMarker(null);
      return next;
    },
    [applySuggestion, syncMarkersFromBody],
  );

  const handleTagsManualChange = useCallback(
    (nextTags: string[]) => {
      manualTagsRef.current = tagsWithoutInline(body, nextTags);
      onTagsChange(mergeInlineTags(body, manualTagsRef.current));
    },
    [body, onTagsChange],
  );

  const handleMarkerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!activeMarker || suggestions.length === 0) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex((i) => (i + 1) % suggestions.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pick = suggestions[menuIndex] ?? suggestions[0];
        if (pick?.label) {
          const next = pickSuggestion(pick.label);
          if (next) {
            (e.currentTarget as HTMLTextAreaElement).value = next.text;
            (e.currentTarget as HTMLTextAreaElement).setSelectionRange(next.cursor, next.cursor);
            return true;
          }
        }
      }
      if (e.key === "Escape") {
        setActiveMarker(null);
        return true;
      }
      return false;
    },
    [activeMarker, menuIndex, pickSuggestion, suggestions],
  );

  return {
    activeMarker,
    suggestions,
    menuIndex,
    setMenuIndex,
    syncMarkersFromBody,
    updateActiveMarker,
    pickSuggestion,
    handleTagsManualChange,
    handleMarkerKeyDown,
    dismissMarkerMenu: () => setActiveMarker(null),
  };
}
