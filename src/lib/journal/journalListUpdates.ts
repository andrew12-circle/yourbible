import type { JournalEntryListRow, JournalListOptions } from "./entryListQuery";
import { journalValueEqual, type JournalSnapshot } from "./journalSaveQueue";

export const JOURNAL_LIST_ENTRY_SAVED = "yourbible:journal-list-entry-saved";

/** Only acknowledged snapshots are published; this never initiates a save. */
export function notifyJournalListEntrySaved(snapshot: JournalSnapshot): void {
  window.dispatchEvent(new CustomEvent(JOURNAL_LIST_ENTRY_SAVED, { detail: snapshot }));
}

const PREVIEW_FIELDS = ["title", "body", "summary", "mood", "location_name", "weather",
  "weather_temp_c", "weather_icon", "analyze_for_mirror"] as const;

/** Patch prose in place. Membership, ordering and search stay server-authoritative. */
export function applyJournalListSnapshot(
  rows: JournalEntryListRow[], snapshot: JournalSnapshot, options: JournalListOptions, unlocked: boolean,
): { rows: JournalEntryListRow[]; reload: boolean } {
  if (snapshot.userId !== options.userId) return { rows, reload: false };
  const index = rows.findIndex((row) => row.id === snapshot.id);
  const row = rows[index];
  if (!row || row.contentLocked || (snapshot.encrypted && !unlocked)
    || Boolean(row.e2e_encrypted) !== snapshot.encrypted || options.search?.trim() || options.sortUpdated) {
    return { rows, reload: true };
  }
  for (const key of ["journal_id", "entry_kind", "pinned"] as const) {
    if (key in snapshot.values && !journalValueEqual(row[key], snapshot.values[key])) return { rows, reload: true };
  }
  if (typeof snapshot.values.entry_at_ts === "string"
    && Date.parse(row.entry_at_ts) !== Date.parse(snapshot.values.entry_at_ts)) return { rows, reload: true };
  const patch = Object.fromEntries(PREVIEW_FIELDS.filter((key) => key in snapshot.values).map((key) => [
    key, key === "body" ? String(snapshot.values.body ?? "").slice(0, 512) : snapshot.values[key],
  ]));
  if (Object.entries(patch).every(([key, value]) => journalValueEqual(row[key as keyof JournalEntryListRow], value))) {
    return { rows, reload: false };
  }
  const next = [...rows];
  next[index] = { ...row, ...patch };
  return { rows: next, reload: false };
}
