/** Canonical href for opening a journal entry (read or chat). */
export function journalEntryHref(entryId: string, entryKind?: string | null): string {
  if (entryKind === "chat") return `/journal/chat/${entryId}`;
  return `/journal/${entryId}`;
}

/** Mobile composer URL after creating a blank entry. */
export function journalNewEntryEditHref(entryId: string): string {
  return `/journal/${entryId}/edit`;
}

/** Desktop 3-pane URL for selecting an entry in the list. */
export function journalDeskEntryHref(
  entryId: string,
  journalId: string | null,
  entryKind?: string | null,
): string {
  if (entryKind === "chat") return `/journal/chat/${entryId}`;
  if (journalId) return `/journal/j/${journalId}/e/${entryId}`;
  return `/journal/e/${entryId}`;
}
