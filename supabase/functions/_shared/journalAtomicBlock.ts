export type JournalBlockRow = {
  id: string; body: string; title: string | null; summary: string | null;
  user_id: string; revision: number; e2e_encrypted: boolean;
};
/** Retry an immutable AI result against the latest body, never against a stale snapshot. */
export async function appendJournalBlock<T extends JournalBlockRow>(options: {
  entryId: string; userId: string; marker: string; block: string;
  read: () => Promise<T | null>;
  compareAndSwap: (row: T, body: string) => Promise<T | null>;
}): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await options.read();
    if (!row || row.id !== options.entryId || row.user_id !== options.userId) throw new Error("Journal entry not found.");
    if (row.e2e_encrypted) throw new Error("Encrypted journal content cannot be processed by this transcription service.");
    if (!Number.isSafeInteger(row.revision)) throw new Error("Journal revision support is required.");
    if (row.body.includes(options.marker)) return row;
    const body = `${row.body}${row.body.trim() ? "\n\n" : ""}${options.marker}\n${options.block}`;
    const written = await options.compareAndSwap(row, body);
    if (written) return written;
  }
  throw new Error("This entry is still changing. The sketch remains saved; retry its transcription.");
}
