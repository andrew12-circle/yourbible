/** Parsed from official YouTube description chapter lines (timestamps at line start). */

export type YoutubeChapter = { title: string; start_seconds: number };

function parseHmsToSeconds(raw: string): number | null {
  const s = raw.trim();
  const parts = s.split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => {
    const n = Number(p);
    return Number.isFinite(n) ? n : NaN;
  });
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

/**
 * Extract chapter markers from a video description (same source YouTube uses for its chapter UI).
 * Matches lines like `0:00 Intro`, `1:23:45 Finale`, `00:15 - Next topic`.
 */
export function parseYoutubeChaptersFromDescription(description: string): YoutubeChapter[] {
  if (!description?.trim()) return [];
  const lines = description.split(/\r?\n/);
  /** Timestamp at beginning of line; optional bullet; optional dash between time and title */
  const re = /^\s*(?:[-*•]\s*)?(\d{1,3}:\d{2}(?::\d{2})?)\s*(?:[-–—|]\s*)?\s*(.+)$/;
  const out: YoutubeChapter[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(re);
    if (!m) continue;
    const secs = parseHmsToSeconds(m[1]);
    if (secs == null) continue;
    const title = m[2].replace(/\s+/g, " ").trim();
    if (!title || title.length > 220) continue;
    out.push({ title, start_seconds: Math.floor(secs) });
  }
  out.sort((a, b) => a.start_seconds - b.start_seconds);
  const deduped: YoutubeChapter[] = [];
  for (const c of out) {
    const last = deduped[deduped.length - 1];
    if (last && last.start_seconds === c.start_seconds) continue;
    deduped.push(c);
  }
  return deduped;
}
