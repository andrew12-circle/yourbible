import { useEffect, useRef } from "react";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import { shouldSuggestJournalTitle } from "@/lib/journal/entryDisplay";

type EntrySlice = {
  id: string;
  title: string | null;
  body: string;
  summary?: string | null;
  e2e_encrypted?: boolean;
  contentLocked?: boolean;
};

const MAX_CONCURRENT = 2;
const MAX_PER_LOAD = 8;

/** Lazily asks Gemini for titles on untitled entries and patches local state. */
export function useJournalTitleBackfill(
  entries: EntrySlice[],
  onTitle: (id: string, title: string) => void,
) {
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    const candidates = entries.filter(
      (e) =>
        !e.e2e_encrypted && !e.contentLocked &&
        !attempted.current.has(e.id) &&
        shouldSuggestJournalTitle(e.title, e.body, e.summary),
    );
    if (!candidates.length) return;

    let cancelled = false;
    let inFlight = 0;
    let idx = 0;

    const runNext = () => {
      if (cancelled || idx >= candidates.length || inFlight >= MAX_CONCURRENT) return;
      if (idx >= MAX_PER_LOAD) return;

      const entry = candidates[idx++];
      attempted.current.add(entry.id);
      inFlight += 1;

      void suggestJournalEntryTitle({ entryId: entry.id, body: entry.body })
        .then((res) => {
          if (!cancelled && res.ok && res.persisted && !res.skipped && res.title) onTitle(entry.id, res.title);
        })
        .catch(() => { /* Leave the existing title unchanged; manual retry remains available. */ })
        .finally(() => {
          inFlight -= 1;
          runNext();
        });

      runNext();
    };

    runNext();
    return () => {
      cancelled = true;
    };
  }, [entries, onTitle]);
}
