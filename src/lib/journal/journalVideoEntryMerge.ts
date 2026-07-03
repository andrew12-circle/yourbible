import { fetchJournalEntryDetail, updateJournalEntry } from "@/lib/journal/journalEntryDb";
import {
  finalizeVideoJournalBody,
  type VideoJournalBodySnap,
} from "@/lib/journal/journalVideoBody";

export const JOURNAL_VIDEO_SAVED_EVENT = "yb-journal-video-saved";

export type JournalVideoSavedEventDetail = {
  entryId: string;
  body: string;
};

/** Merge a finalized video transcript into the journal entry body (server-side). */
export async function persistVideoJournalTranscriptToEntry(
  userId: string,
  entryId: string,
  transcript: string,
  anchorOffset: number,
  snap: VideoJournalBodySnap | null,
): Promise<string | null> {
  if (!transcript.trim()) return null;
  const entry = await fetchJournalEntryDetail(entryId);
  if (!entry) return null;

  const nextBody = finalizeVideoJournalBody(snap, entry.body ?? "", anchorOffset, transcript);
  if (nextBody === entry.body) return nextBody;

  const { error } = await updateJournalEntry(
    userId,
    entryId,
    { body: nextBody },
    { journalId: entry.journal_id },
  );
  if (error) throw error;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<JournalVideoSavedEventDetail>(JOURNAL_VIDEO_SAVED_EVENT, {
        detail: { entryId, body: nextBody },
      }),
    );
  }
  return nextBody;
}

export function bodySnapFromMeta(
  bodySnapBody?: string | null,
  bodySnapAnchor?: number | null,
): VideoJournalBodySnap | null {
  if (bodySnapBody == null || bodySnapAnchor == null) return null;
  return { body: bodySnapBody, anchor: bodySnapAnchor };
}
