/** Prefer live telemetry; fall back to last known position (0 is valid). */
export function resolvePlaybackSeconds(
  staticTime: number | null | undefined,
  fallback: number,
): number {
  return staticTime ?? fallback;
}
