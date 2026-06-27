export type JournalVideoChapter = {
  label: string;
  atMs: number;
};

export function formatChapterLabel(index: number): string {
  return `Topic ${index + 1}`;
}

/** Insert chapter breaks into a live or final transcript. */
export function applyVideoChaptersToTranscript(
  transcript: string,
  chapters: JournalVideoChapter[],
): string {
  const base = transcript.trim();
  if (!base || chapters.length === 0) return base;
  const markers = chapters
    .map((c) => `\n\n--- **${c.label.trim() || "Chapter"}** (${formatChapterClock(c.atMs)}) ---\n\n`)
    .join("");
  return `${base}${markers}`;
}

function formatChapterClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
