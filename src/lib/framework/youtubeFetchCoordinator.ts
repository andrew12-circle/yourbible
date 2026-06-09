/** Suppress auto-retry while a user-initiated browser caption fetch is in flight. */
const manualFetchUntil = new Map<string, number>();

export function markManualYoutubeFetch(artifactId: string, ms = 60_000): void {
  manualFetchUntil.set(artifactId, Date.now() + ms);
}

export function isManualYoutubeFetchActive(artifactId: string): boolean {
  const until = manualFetchUntil.get(artifactId);
  if (!until) return false;
  if (Date.now() > until) {
    manualFetchUntil.delete(artifactId);
    return false;
  }
  return true;
}
