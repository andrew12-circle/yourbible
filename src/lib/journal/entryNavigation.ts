/** Canonical href for opening a journal entry (read view). */
export function journalEntryHref(entryId: string, _entryKind?: string | null): string {
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
  _entryKind?: string | null,
): string {
  if (journalId) return `/journal/j/${journalId}/e/${entryId}`;
  return `/journal/e/${entryId}`;
}
