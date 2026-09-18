const tails = new Map<string, Promise<unknown>>();
/** Serializes entry writes, photo mutations and deletion; Web Locks also coordinate tabs. */
export function withJournalEntryLock<T>(userId: string, entryId: string, work: () => Promise<T>): Promise<T> {
  const key = `journal-document:${userId}:${entryId}`;
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request(key, work);
  const previous = tails.get(key) ?? Promise.resolve();
  const task = previous.catch(() => {}).then(work);
  tails.set(key, task);
  void task.finally(() => { if (tails.get(key) === task) tails.delete(key); }).catch(() => {});
  return task;
}
