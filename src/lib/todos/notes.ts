/** Locale-friendly stamp for task note entries (voice or manual). */
export function formatTodoNoteTimestamp(date: Date = new Date()): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Prefix a new note block with a timestamp, separated from prior notes. */
export function prependTimestampedNoteBlock(existingNotes: string, date: Date = new Date()): string {
  const stamp = formatTodoNoteTimestamp(date);
  const prefix = existingNotes.trim() ? `\n\n[${stamp}] ` : `[${stamp}] `;
  return existingNotes + prefix;
}
