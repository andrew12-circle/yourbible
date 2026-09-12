import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchJournalEntryListPage, type JournalEntryListRow, type JournalListOptions } from "@/lib/journal/entryListQuery";
import { fetchEntryListMediaUrls } from "@/lib/journal/entryListMedia";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { formatJournalLoadError } from "@/lib/journal/journalE2eSchema";

type ListState = {
  scope: string; dek: CryptoKey | null; rows: JournalEntryListRow[]; hasMore: boolean;
  photoUrls: Record<string, string>; videoUrls: Record<string, string>; error: string | null;
};
const EMPTY: JournalEntryListRow[] = [];

/** One loading/pagination path for mobile and desktop, with account/vault isolation. */
export function useJournalListController(options: JournalListOptions & { reloadKey?: number }) {
  const dek = useJournalVaultStore((state) => state.dek);
  const scope = JSON.stringify([options.userId, options.journalId, options.entryKindFilter,
    [...(options.excludeJournalIds ?? [])].sort(), options.search?.trim() ?? "", options.sortUpdated, options.reloadKey]);
  const latest = useRef({ options, scope, dek });
  latest.current = { options, scope, dek };
  const [state, setState] = useState<ListState | null>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const request = useRef<{ controller: AbortController; scope: string; dek: CryptoKey | null } | null>(null);
  const [busy, setBusy] = useState<"initial" | "more" | null>(null);
  const isCurrent = state?.scope === scope && state?.dek === dek;

  const load = useCallback(async (append = false) => {
    const current = latest.current;
    if (!current.options.userId) return;
    if (append && request.current?.scope === current.scope && !request.current.controller.signal.aborted) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { controller, scope: current.scope, dek: current.dek };
    const matches = () => !controller.signal.aborted && latest.current.scope === current.scope && latest.current.dek === current.dek;
    const previous = stateRef.current?.scope === current.scope && stateRef.current.dek === current.dek ? stateRef.current : null;
    setBusy(append ? "more" : "initial");
    try {
      const page = await fetchJournalEntryListPage(supabase, { ...current.options,
        offset: append ? previous?.rows.length ?? 0 : 0, signal: controller.signal });
      if (!matches()) return;
      const media = await fetchEntryListMediaUrls(page.rows.filter((row) => !row.contentLocked).map((row) => row.id));
      if (!matches()) return;
      const combined = append ? [...(previous?.rows ?? []), ...page.rows] : page.rows;
      setState({ scope: current.scope, dek: current.dek, rows: [...new Map(combined.map((row) => [row.id, row])).values()],
        hasMore: page.hasMore, error: null,
        photoUrls: append ? { ...previous?.photoUrls, ...media.photoUrls } : media.photoUrls,
        videoUrls: append ? { ...previous?.videoUrls, ...media.videoUrls } : media.videoUrls });
    } catch (cause) {
      if (matches()) setState({ scope: current.scope, dek: current.dek, rows: previous?.rows ?? [],
        hasMore: previous?.hasMore ?? false, photoUrls: previous?.photoUrls ?? {}, videoUrls: previous?.videoUrls ?? {}, error: formatJournalLoadError(cause) });
    } finally {
      if (request.current?.controller === controller) { request.current = null; setBusy(null); }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), options.search?.trim() ? 250 : 0);
    return () => { clearTimeout(timeout); request.current?.controller.abort(); };
  }, [scope, dek, load]); // query scope contains all list filters

  const setEntries = useCallback((change: SetStateAction<JournalEntryListRow[]>) => {
    const current = latest.current;
    setState((value) => value?.scope === current.scope && value.dek === current.dek
      ? { ...value, rows: typeof change === "function" ? change(value.rows) : change } : value);
  }, []);

  return { entries: isCurrent ? state.rows : EMPTY, setEntries,
    photoUrls: isCurrent ? state.photoUrls : {}, videoUrls: isCurrent ? state.videoUrls : {},
    hasMore: isCurrent && state.hasMore, loadError: isCurrent ? state.error : null,
    loading: Boolean(options.userId) && (!isCurrent || busy === "initial"), loadingMore: busy === "more", load };
}
