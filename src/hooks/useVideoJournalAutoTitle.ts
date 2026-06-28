import { useCallback, useRef } from "react";
import { extractReadableProse } from "@/lib/journal/entryDisplay";
import { enrichVideoJournalEntry, type VideoJournalEnrichResult } from "@/lib/journal/videoJournalEnrich";
import { canAutoManageVideoJournalTitle, formatVideoJournalStamp } from "@/lib/journal/videoJournalTitle";

type UseVideoJournalAutoTitleOptions = {
  title: string;
  setTitle: (title: string) => void;
  entryAt?: string;
  persistTitle?: (title: string) => void;
  /** When set, AI summary + title run after recording (server-persisted). */
  entryId?: string | null;
  onSummary?: (summary: string) => void;
  onSummarizingChange?: (summarizing: boolean) => void;
};

/** Auto-titles video journal entries with a date stamp at record start unless the user edits the title. */
export function useVideoJournalAutoTitle({
  title,
  setTitle,
  entryAt,
  persistTitle,
  entryId,
  onSummary,
  onSummarizingChange,
}: UseVideoJournalAutoTitleOptions) {
  const lockedRef = useRef(false);
  const titleRef = useRef(title);
  titleRef.current = title;
  const entryIdRef = useRef(entryId);
  entryIdRef.current = entryId;

  const applyAutoTitle = useCallback(
    (next: string) => {
      if (lockedRef.current || !next.trim() || next === titleRef.current) return;
      setTitle(next);
      persistTitle?.(next);
    },
    [setTitle, persistTitle],
  );

  const markTitleEdited = useCallback(() => {
    lockedRef.current = true;
  }, []);

  const stampForEntry = useCallback(
    () => formatVideoJournalStamp(entryAt ? new Date(entryAt) : new Date()),
    [entryAt],
  );

  const onRecordingStart = useCallback(() => {
    if (lockedRef.current) return;
    const stamp = stampForEntry();
    if (canAutoManageVideoJournalTitle(titleRef.current)) {
      applyAutoTitle(stamp);
    }
  }, [applyAutoTitle, stampForEntry]);

  const enrichAfterRecording = useCallback(
    async (body: string): Promise<VideoJournalEnrichResult> => {
      const id = entryIdRef.current;
      if (!id || lockedRef.current) return { skipped: true };
      if (extractReadableProse(body).length < 40) return { skipped: true };

      onSummarizingChange?.(true);
      try {
        const result = await enrichVideoJournalEntry({ entryId: id, body });
        if (lockedRef.current) return result;
        if (result.summary) onSummary?.(result.summary);
        return result;
      } finally {
        onSummarizingChange?.(false);
      }
    },
    [onSummary, onSummarizingChange],
  );

  const onRecordingComplete = useCallback(
    async (body: string): Promise<VideoJournalEnrichResult | void> => {
      if (entryIdRef.current) {
        return await enrichAfterRecording(body);
      }
    },
    [enrichAfterRecording],
  );

  return {
    markTitleEdited,
    onRecordingStart,
    onRecordingComplete,
  };
}
