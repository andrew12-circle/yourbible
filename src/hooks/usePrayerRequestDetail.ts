import { useCallback, useEffect, useState } from "react";
import {
  createTimelineEvent,
  deleteTimelineEvent,
  fetchPrayerRequest,
  listTimelineEvents,
  linkJournalEntryToRequest,
} from "@/lib/prayer/api";
import { inferTimelineKindFromJournal } from "@/lib/prayer/timeline";
import { supabase } from "@/integrations/supabase/client";
import type {
  CreateTimelineEventInput,
  PrayerRequestRow,
  PrayerTimelineEventRow,
} from "@/lib/prayer/types";

export function usePrayerRequestDetail(userId: string | undefined, requestId: string | undefined) {
  const [request, setRequest] = useState<PrayerRequestRow | null>(null);
  const [events, setEvents] = useState<PrayerTimelineEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId || !requestId) return;
    setLoading(true);
    try {
      const [req, ev] = await Promise.all([
        fetchPrayerRequest(userId, requestId),
        listTimelineEvents(userId, requestId),
      ]);
      setRequest(req);
      setEvents(ev);
    } finally {
      setLoading(false);
    }
  }, [userId, requestId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addEvent = async (input: Omit<CreateTimelineEventInput, "prayerRequestId">) => {
    if (!userId || !requestId) return null;
    const row = await createTimelineEvent(userId, { ...input, prayerRequestId: requestId });
    if (row) setEvents((prev) => [...prev, row].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)));
    return row;
  };

  const removeEvent = async (eventId: string) => {
    if (!userId) return;
    await deleteTimelineEvent(userId, eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const linkJournalEntry = async (entryId: string, title: string) => {
    if (!userId || !requestId) return;
    const { data: entry } = await supabase
      .from("journal_entries")
      .select("entry_kind")
      .eq("id", entryId)
      .maybeSingle();
    const kind = inferTimelineKindFromJournal(entry?.entry_kind ?? null);
    await linkJournalEntryToRequest(userId, entryId, requestId);
    await addEvent({
      eventKind: kind,
      title,
      linkRef: { entry_id: entryId },
    });
  };

  const linkArtifact = async (artifactId: string, title: string) => {
    await addEvent({
      eventKind: "artifact",
      title,
      linkRef: { artifact_id: artifactId },
    });
  };

  const linkVerse = async (verseRef: string) => {
    await addEvent({
      eventKind: "scripture",
      title: `Read ${verseRef}`,
      linkRef: { verse_ref: verseRef },
    });
  };

  return {
    request,
    events,
    loading,
    reload,
    setRequest,
    addEvent,
    removeEvent,
    linkJournalEntry,
    linkArtifact,
    linkVerse,
  };
}
