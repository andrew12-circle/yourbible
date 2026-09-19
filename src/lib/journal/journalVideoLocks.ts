/** Local index commits must never wait behind a network upload. */
const localFlights = new Map<string, Promise<unknown>>();

export async function withJournalVideoLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && typeof navigator.locks?.request === "function") {
    // An advertised but rejected lock fails closed; do not run uncoordinated work.
    return navigator.locks.request(name, { mode: "exclusive" }, work);
  }
  // Older browsers still serialize callers in this page. Stable remote recording IDs
  // remain the final duplicate defense on surfaces without origin-wide Web Locks.
  const previous = localFlights.get(name) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(work);
  localFlights.set(name, next);
  try { return await next; }
  finally { if (localFlights.get(name) === next) localFlights.delete(name); }
}

export function withJournalVideoUploadItemLock<T>(userId: string, id: string, work: () => Promise<T>): Promise<T> {
  return withJournalVideoLock(`yourbible-journal-video-upload:${userId}:${id}`, work);
}
