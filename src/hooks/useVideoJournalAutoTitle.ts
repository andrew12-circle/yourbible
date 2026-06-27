import { useCallback, useEffect, useRef } from "react";
import { extractReadableProse, isPlaceholderJournalTitle } from "@/lib/journal/entryDisplay";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import { enrichVideoJournalEntry, type VideoJournalEnrichResult } from "@/lib/journal/videoJournalEnrich";
import {
  formatVideoJournalStamp,
  pickLiveVideoJournalTitle,
} from "@/lib/journal/videoJournalTitle";

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

/** Auto-titles video journal entries: stamp at record start, then transcript excerpt, then AI polish. */
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
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryIdRef = useRef(entryId);
  entryIdRef.current = entryId;

  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

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
    if (suggestTimerRef.current) {
      clearTimeout(suggestTimerRef.current);
      suggestTimerRef.current = null;
    }
  }, []);

  const stampForEntry = useCallback(
    () => formatVideoJournalStamp(entryAt ? new Date(entryAt) : new Date()),
    [entryAt],
  );

  const onRecordingStart = useCallback(() => {
    if (lockedRef.current) return;
    const stamp = stampForEntry();
    if (isPlaceholderJournalTitle(titleRef.current)) {
      applyAutoTitle(stamp);
    }
  }, [applyAutoTitle, stampForEntry]);

  const onLiveTranscriptBody = useCallback(
    (body: string) => {
      if (lockedRef.current) return;
      const next = pickLiveVideoJournalTitle(titleRef.current, body, stampForEntry());
      if (next) applyAutoTitle(next);
    },
    [applyAutoTitle, stampForEntry],
  );

  const scheduleAiTitle = useCallback(
    (body: string) => {
      if (lockedRef.current || entryIdRef.current) return;
      if (extractReadableProse(body).length < 40) return;
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
      suggestTimerRef.current = setTimeout(() => {
        void suggestJournalEntryTitle({ body }).then((res) => {
          if (lockedRef.current || !res.ok || !res.title) return;
          applyAutoTitle(res.title);
        });
      }, 1500);
    },
    [applyAutoTitle],
  );

  const enrichAfterRecording = useCallback(
    async (body: string): Promise<VideoJournalEnrichResult> => {
      const id = entryIdRef.current;
      if (!id || lockedRef.current) return { skipped: true };
      if (extractReadableProse(body).length < 40) return { skipped: true };

      onSummarizingChange?.(true);
      try {
        const result = await enrichVideoJournalEntry({ entryId: id, body });
        if (lockedRef.current) return result;
        if (result.title) applyAutoTitle(result.title);
        if (result.summary) onSummary?.(result.summary);
        return result;
      } finally {
        onSummarizingChange?.(false);
      }
    },
    [applyAutoTitle, onSummary, onSummarizingChange],
  );

  const onRecordingComplete = useCallback(
    async (body: string): Promise<VideoJournalEnrichResult | void> => {
      onLiveTranscriptBody(body);
      if (entryIdRef.current) {
        return await enrichAfterRecording(body);
      }
      scheduleAiTitle(body);
    },
    [onLiveTranscriptBody, enrichAfterRecording, scheduleAiTitle],
  );

  return {
    markTitleEdited,
    onRecordingStart,
    onLiveTranscriptBody,
    onRecordingComplete,
  };
}
