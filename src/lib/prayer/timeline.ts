import type { JournalEntryKind } from "@/lib/journal/entryKinds";
import type { PrayerTimelineEventKind } from "@/lib/prayer/types";

export const TIMELINE_EVENT_LABELS: Record<PrayerTimelineEventKind, string> = {
  asked: "Asked",
  note: "Note",
  scripture: "Scripture",
  journal: "Journal",
  artifact: "Sermon / media",
  dream: "Dream",
  worship: "Worship",
  gratitude: "Gratitude",
  opportunity: "Opportunity",
  answered: "Answered",
  praise: "Praise report",
};

export function requestedAtToIso(requestedAt: string): string {
  return `${requestedAt}T12:00:00.000Z`;
}

export function buildAskedEventTitle(title: string): string {
  return `Asked for ${title.trim() || "this need"}`;
}

export function timelineKindForJournalEntry(entryKind: string | null): PrayerTimelineEventKind {
  if (entryKind === "dream") return "dream";
  if (entryKind === "morning_conversation" || entryKind === "morning_review") return "worship";
  if (entryKind === "praise_report") return "gratitude";
  return "journal";
}

export function inferTimelineKindFromJournal(
  entryKind: JournalEntryKind | string | null,
): PrayerTimelineEventKind {
  return timelineKindForJournalEntry(entryKind);
}
