import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchJournalEntryListPage, type JournalEntryListRow, type JournalListOptions } from "@/lib/journal/entryListQuery";
import { fetchEntryListMediaUrls } from "@/lib/journal/entryListMedia";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { formatJournalLoadError } from "@/lib/journal/journalE2eSchema";

import { applyJournalListSnapshot, JOURNAL_LIST_ENTRY_SAVED } from "@/lib/journal/journalListUpdates";
import type { JournalSnapshot } from "@/lib/journal/journalSaveQueue";
import type { StableMediaUrlCache } from "@/lib/journal/stableMediaUrls";

type ListState = {
  scope: string; dek: CryptoKey | null; rows: JournalEntryListRow[]; hasMore: boolean;
  photoUrls: Record<string, string>; videoUrls: Record<string, string>; error: string | null;
  errorKind?: "load" | "refresh";
  mediaError?: string | null;
};
const EMPTY: JournalEntryListRow[] = [];

/** One loading/pagination path for mobile and desktop, with account/vault isolation. */
export function useJournalListController(options: JournalListOptions & { reloadKey?: number }) {
  const dek = useJournalVaultStore((state) => state.dek);
  // A refresh is not a different collection. Including reloadKey here used to
  // empty the list (and unmount every thumbnail) after each autosave.
  const scope = JSON.stringify([options.userId, options.journalId, options.entryKindFilter,
    [...(options.excludeJournalIds ?? [])].sort(), options.search?.trim() ?? "", options.sortUpdated, options.limit]);
  const mediaCache = useMemo<StableMediaUrlCache>(() => ({ urls: new Map(), pending: new Map() }), [options.userId, dek]);
  const latest = useRef({ options, scope, dek, mediaCache });
  latest.current = { options, scope, dek, mediaCache };
  const [state, setState] = useState<ListState | null>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const request = useRef<{ controller: AbortController; scope: string; dek: CryptoKey | null } | null>(null);
  const [busy, setBusy] = useState<"initial" | "more" | "refresh" | null>(null);
  const mediaGeneration = useRef(0);
  const isCurrent = state?.scope === scope && state?.dek === dek;

  const loadMedia = useCallback(async (rows: JournalEntryListRow[]) => {
    const current = latest.current;
    const generation = ++mediaGeneration.current;
    const matches = () => generation === mediaGeneration.current && latest.current.scope === current.scope && latest.current.dek === current.dek;
    try {
      const media = await fetchEntryListMediaUrls(rows.filter((row) => !row.contentLocked).map((row) => row.id), current.mediaCache);
      if (!matches()) return;
      setState((value) => value?.scope === current.scope && value.dek === current.dek
        ? { ...value, photoUrls: media.photoUrls, videoUrls: media.videoUrls, mediaError: null } : value);
    } catch (cause) {
      if (matches()) setState((value) => value?.scope === current.scope && value.dek === current.dek
        ? { ...value, mediaError: formatJournalLoadError(cause) } : value);
    }
  }, []);
  const retryMedia = useCallback(() => {
    const current = latest.current, value = stateRef.current;
    if (value?.scope === current.scope && value.dek === current.dek) return loadMedia(value.rows);
    return Promise.resolve();
  }, [loadMedia]);

  const load = useCallback(async (append = false) => {
    const current = latest.current;
    if (!current.options.userId) return;
    if (append && request.current?.scope === current.scope && request.current.dek === current.dek && !request.current.controller.signal.aborted) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { controller, scope: current.scope, dek: current.dek };
    const matches = () => !controller.signal.aborted && latest.current.scope === current.scope && latest.current.dek === current.dek
      && latest.current.options.reloadKey === current.options.reloadKey;
    const previous = stateRef.current?.scope === current.scope && stateRef.current.dek === current.dek ? stateRef.current : null;
    setBusy(append ? "more" : previous ? "refresh" : "initial");
    try {
      let page = await fetchJournalEntryListPage(supabase, { ...current.options,
        offset: append ? previous?.rows.length ?? 0 : 0, signal: controller.signal });
      if (!matches()) return;
      const rows = [...page.rows];
      // Refresh the loaded window, not just page one: saving must not remove
      // already-loaded entries or collapse the user's scroll position.
      while (!append && page.hasMore && page.rows.length > 0 && rows.length < (previous?.rows.length ?? 0)) {
        page = await fetchJournalEntryListPage(supabase, { ...current.options,
          offset: rows.length, signal: controller.signal });
        if (!matches()) return;
        rows.push(...page.rows);
      }
      const combined = append ? [...(previous?.rows ?? []), ...rows] : rows;
      const nextRows = [...new Map(combined.map((row) => [row.id, row])).values()];
      const visibleIds = new Set(nextRows.filter((row) => !row.contentLocked).map((row) => row.id));
      const keepVisible = (urls: Record<string, string> = {}) => Object.fromEntries(Object.entries(urls).filter(([id]) => visibleIds.has(id)));
      setState({ scope: current.scope, dek: current.dek, rows: nextRows, hasMore: page.hasMore, error: null,
        photoUrls: keepVisible(previous?.photoUrls), videoUrls: keepVisible(previous?.videoUrls), mediaError: null });
      // Media is optional decoration, never a prerequisite for reading journal text.
      void loadMedia(nextRows);
    } catch (cause) {
      if (matches()) setState({ scope: current.scope, dek: current.dek, rows: previous?.rows ?? [],
        hasMore: previous?.hasMore ?? false, photoUrls: previous?.photoUrls ?? {}, videoUrls: previous?.videoUrls ?? {},
        error: formatJournalLoadError(cause), errorKind: !append && previous?.rows.length ? "refresh" : "load" });
    } finally {
      if (request.current?.controller === controller) { request.current = null; setBusy(null); }
    }
  }, [loadMedia]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), options.search?.trim() ? 250 : 0);
    return () => { clearTimeout(timeout); request.current?.controller.abort(); mediaGeneration.current += 1; };
  }, [scope, dek, options.reloadKey, load]); // scope isolates filters; reloadKey refreshes in place

  useEffect(() => {
    const onSaved = (event: Event) => {
      const snapshot = (event as CustomEvent<JournalSnapshot>).detail;
      const current = latest.current;
      if (!snapshot || snapshot.userId !== current.options.userId) return;
      const previous = stateRef.current;
      if (!previous || previous.scope !== current.scope || previous.dek !== current.dek) {
        void load();
        return;
      }
      const update = applyJournalListSnapshot(previous.rows, snapshot, current.options, Boolean(current.dek));
      if (!update.reload) {
        setState((value) => {
          if (!value || value.scope !== current.scope || value.dek !== current.dek) return value;
          const next = applyJournalListSnapshot(value.rows, snapshot, current.options, Boolean(current.dek));
          return next.rows === value.rows ? value : { ...value, rows: next.rows };
        });
      }
      // A pre-save read cannot overwrite the acknowledged preview. Abort/restart
      // that read; the normal idle autosave path performs no list/media request.
      if (update.reload || request.current) void load();
    };
    window.addEventListener(JOURNAL_LIST_ENTRY_SAVED, onSaved);
    return () => window.removeEventListener(JOURNAL_LIST_ENTRY_SAVED, onSaved);
  }, [load]);

  useEffect(() => {
    const recovered = () => { void load(); };
    const removed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; entryId: string }>).detail;
      if (detail?.userId !== latest.current.options.userId) return;
      request.current?.controller.abort();
      setState((value) => value ? { ...value, rows: value.rows.filter((row) => row.id !== detail.entryId) } : value);
      void load();
    };
    window.addEventListener("yourbible:journal-attachments-recovered", recovered);
    window.addEventListener("yourbible:journal-entry-deleted", removed);
    return () => {
      window.removeEventListener("yourbible:journal-attachments-recovered", recovered);
      window.removeEventListener("yourbible:journal-entry-deleted", removed);
    };
  }, [load]);

  const setEntries = useCallback((change: SetStateAction<JournalEntryListRow[]>) => {
    const current = latest.current;
    setState((value) => value?.scope === current.scope && value.dek === current.dek
      ? { ...value, rows: typeof change === "function" ? change(value.rows) : change } : value);
  }, []);

  return { entries: isCurrent ? state.rows : EMPTY, setEntries,
    photoUrls: isCurrent ? state.photoUrls : {}, videoUrls: isCurrent ? state.videoUrls : {},
    hasMore: isCurrent && state.hasMore,
    // A background read failure must not replace an already visible list with
    // a blocking error screen. Initial and load-more failures keep their retry UI.
    loadError: isCurrent && state.errorKind !== "refresh" ? state.error : null,
    refreshError: isCurrent && state.errorKind === "refresh" ? state.error : null,
    loading: Boolean(options.userId) && (!isCurrent || busy === "initial"), loadingMore: busy === "more",
    mediaError: isCurrent ? state.mediaError ?? null : null, retryMedia,
    refreshing: busy === "refresh", load };
}
