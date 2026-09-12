import { openJournalDocument, synchronizeJournalEditors } from "@/lib/journal/journalDocuments";
import { prepareVideoJournalTranscript, type VideoJournalBodySnap } from "@/lib/journal/journalVideoBody";
import { mergeVideoTranscriptSafely } from "@/lib/journal/journalTextMerge";

export const JOURNAL_VIDEO_SAVED_EVENT = "yb-journal-video-saved";
export type JournalVideoSavedEventDetail = { entryId: string; body: string };

/** A recording can leave its durable queue only after this write is acknowledged. */
export async function persistVideoJournalTranscriptToEntry(
  userId: string,
  entryId: string,
  transcript: string,
  anchorOffset: number,
  snap: VideoJournalBodySnap | null,
  previousTranscript?: string,
): Promise<string | null> {
  if (!transcript.trim()) return null;
  const queue = await openJournalDocument(userId, entryId);
  synchronizeJournalEditors(userId, entryId);
  const current = String(queue.current().values.body ?? "");
  const body = mergeVideoTranscriptSafely({
    current, transcript: prepareVideoJournalTranscript(transcript), anchor: anchorOffset, snap,
    previousTranscript: previousTranscript ? prepareVideoJournalTranscript(previousTranscript) : undefined,
  });
  if (body !== current) queue.patch({ body });
  const result = await queue.flush();
  if (!result.ok) throw result.error;
  const acknowledged = String(result.snapshot.values.body ?? "");
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<JournalVideoSavedEventDetail>(
    JOURNAL_VIDEO_SAVED_EVENT, { detail: { entryId, body: acknowledged } },
  ));
  return acknowledged;
}

export function bodySnapFromMeta(bodySnapBody?: string | null, bodySnapAnchor?: number | null): VideoJournalBodySnap | null {
  return bodySnapBody == null || bodySnapAnchor == null ? null : { body: bodySnapBody, anchor: bodySnapAnchor };
}
