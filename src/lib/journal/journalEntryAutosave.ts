/** Helpers for debounced journal entry autosave — merge pending patches with latest row state. */

export type JournalAutosavePatch = Record<string, unknown>;

export function mergePendingPatches(
  pending: JournalAutosavePatch,
  patch: JournalAutosavePatch,
): JournalAutosavePatch {
  return { ...pending, ...patch };
}

/** Build a DB update payload: each pending key uses the latest value from `current`. */
export function buildFlushPayload<T extends Record<string, unknown>>(
  pending: JournalAutosavePatch,
  current: T,
): JournalAutosavePatch {
  const payload: JournalAutosavePatch = {};
  for (const key of Object.keys(pending)) {
    payload[key] = current[key];
  }
  return payload;
}
