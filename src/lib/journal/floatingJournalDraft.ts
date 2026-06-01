export const GLOBAL_FLOATING_DRAFT_KEY = "__global__";

export function floatingJournalDraftStorageKey(userId: string, artifactId: string | undefined) {
  const key = artifactId?.trim() || GLOBAL_FLOATING_DRAFT_KEY;
  return `yb_journal_floating_draft_v1_${userId}_${key}`;
}

export function formatJournalPlaybackTimestamp(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
