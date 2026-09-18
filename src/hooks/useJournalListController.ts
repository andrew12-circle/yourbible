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
  const isCurrent = state?.scope === scope && state?.dek === dek;

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
      const media = await fetchEntryListMediaUrls(rows.filter((row) => !row.contentLocked).map((row) => row.id), current.mediaCache);
      if (!matches()) return;
      const combined = append ? [...(previous?.rows ?? []), ...rows] : rows;
      setState({ scope: current.scope, dek: current.dek, rows: [...new Map(combined.map((row) => [row.id, row])).values()],
        hasMore: page.hasMore, error: null,
        photoUrls: append ? { ...previous?.photoUrls, ...media.photoUrls } : media.photoUrls,
        videoUrls: append ? { ...previous?.videoUrls, ...media.videoUrls } : media.videoUrls });
    } catch (cause) {
      if (matches()) setState({ scope: current.scope, dek: current.dek, rows: previous?.rows ?? [],
        hasMore: previous?.hasMore ?? false, photoUrls: previous?.photoUrls ?? {}, videoUrls: previous?.videoUrls ?? {},
        error: formatJournalLoadError(cause), errorKind: !append && previous?.rows.length ? "refresh" : "load" });
    } finally {
      if (request.current?.controller === controller) { request.current = null; setBusy(null); }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), options.search?.trim() ? 250 : 0);
    return () => { clearTimeout(timeout); request.current?.controller.abort(); };
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
    refreshing: busy === "refresh", load };
}
