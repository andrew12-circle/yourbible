/**
 * Lightweight fuzzy-ish scoring for graph search (substring + subsequence).
 * Higher is better; 0 means no match.
 */
export function fuzzyScore(haystack: string, needle: string): number {
  if (!needle.trim()) return 1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return 1;
  if (h === n) return 400;
  if (h.startsWith(n)) return 300 + n.length * 2;
  const idx = h.indexOf(n);
  if (idx >= 0) return 200 + n.length * 2 - idx * 0.01;
  let hi = 0;
  let score = 0;
  for (const c of n) {
    const j = h.indexOf(c, hi);
    if (j < 0) return 0;
    score += 8 - Math.min(7, j - hi);
    hi = j + 1;
  }
  return 40 + score;
}

export function bestFuzzyScore(texts: string[], needle: string): number {
  let best = 0;
  for (const t of texts) {
    best = Math.max(best, fuzzyScore(t, needle));
  }
  return best;
}
