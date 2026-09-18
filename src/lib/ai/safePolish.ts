export const MAX_POLISH_CHARS = 12_000;

/** Refuse malformed/truncated/rewritten responses; the original is always a valid fallback. */
export function safePolishedText(original: string, candidate: unknown): string {
  if (typeof candidate !== "string" || !candidate.trim()) return original;
  if (original.length > MAX_POLISH_CHARS || candidate.length > MAX_POLISH_CHARS * 2) return original;
  const words = (text: string) => text.trim().split(/\s+/).length;
  // Copyediting must not summarize an entry or silently drop paragraphs.
  if (candidate.length < original.length * 0.85 || words(candidate) < words(original) * 0.85) return original;
  return candidate;
}
