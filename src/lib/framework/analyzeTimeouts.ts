/** When analyze looks stuck, re-invoke framework-analyze (clears analyze_inflight_at). */
export const ANALYZE_STALE_SECONDS_DEFAULT = 90;
export const ANALYZE_AUTO_RETRY_LIMIT = 2;

/** Base client wait before surfacing a timeout error. */
export const ANALYZE_CLIENT_TIMEOUT_BASE_SECONDS = 300;
export const ANALYZE_CLIENT_TIMEOUT_MAX_SECONDS = 600;
/** +1s per 1k transcript characters (long pasted sermons need more wall clock). */
export const ANALYZE_CLIENT_TIMEOUT_PER_1K_CHARS = 1;

export function analyzeStaleSeconds(rawTextLength: number): number {
  if (rawTextLength >= 80_000) return 240;
  if (rawTextLength >= 40_000) return 150;
  return ANALYZE_STALE_SECONDS_DEFAULT;
}

export function analyzeClientTimeoutSeconds(rawTextLength: number): number {
  const extra = Math.floor(rawTextLength / 1000) * ANALYZE_CLIENT_TIMEOUT_PER_1K_CHARS;
  return Math.min(
    ANALYZE_CLIENT_TIMEOUT_MAX_SECONDS,
    ANALYZE_CLIENT_TIMEOUT_BASE_SECONDS + extra,
  );
}

export function analyzeTimeoutMessage(rawTextLength: number): string {
  const minutes = Math.ceil(analyzeClientTimeoutSeconds(rawTextLength) / 60);
  return `Analysis is still running on the server (long sermons can take up to ${minutes} minutes). Keep this tab open — insight cards appear when the first pass finishes.`;
}
