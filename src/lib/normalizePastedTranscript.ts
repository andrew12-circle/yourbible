/**
 * Normalize YouTube "Show transcript" copy-paste into `[M:SS]` / `[H:MM:SS]` lines
 * expected by `transcriptSplit` / `framework-analyze`.
 */

const BRACKET_TIMESTAMP_INNER_RE = /^\d{1,2}:\d{2}(?::\d{2})?(?:-\d{1,2}:\d{2}(?::\d{2})?)?$/;

/** Bracket label for a wall-clock offset (M:SS or H:MM:SS). */
export function formatBracketTimestamp(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timestampToSeconds(value: string): number | null {
  const parts = value.trim().split(":").map((n) => Number(n));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] ?? null;
  return null;
}

function collapseInlineWhitespace(text: string): string {
  return text.replace(/[^\S\n]+/g, " ").trim();
}

/** True when paste looks like YouTube transcript UI copy (mashed timestamps). */
export function looksLikeYoutubeShowTranscriptPaste(text: string): boolean {
  return (
    /\d:\d{2}\d{1,2}\s*seconds\b/i.test(text) ||
    /\d:\d{2}\d+\s*minute\b/i.test(text) ||
    /\d:\d{2}:\d{2}\d{1,2}\s*seconds\b/i.test(text)
  );
}

/** Fix `0:2222 seconds` / `1:031 minute, 3 seconds` mashed cues anywhere in the blob. */
function fixYoutubeMashedTimestamps(text: string): string {
  let out = text.replace(
    /(\d+):(\d{2}):(\d{2})(\d{1,2})\s*seconds\b/gi,
    (match, h, m, ss, dup) => {
      if (parseInt(ss, 10) !== parseInt(dup, 10)) return match;
      const total = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(ss, 10);
      return `[${formatBracketTimestamp(total)}] `;
    },
  );

  out = out.replace(
    /(\d+):(\d{2})(\d{1,2})\s*seconds\b/gi,
    (match, m, ss, dup) => {
      if (parseInt(ss, 10) !== parseInt(dup, 10)) return match;
      const total = parseInt(m, 10) * 60 + parseInt(ss, 10);
      return `[${formatBracketTimestamp(total)}] `;
    },
  );

  out = out.replace(
    /(\d+):(\d{2})(\d+)\s*minute,?\s*(\d+)\s*seconds\b/gi,
    (match, m, ss, minLabel, secLabel) => {
      if (parseInt(m, 10) !== parseInt(minLabel, 10)) return match;
      if (parseInt(ss, 10) !== parseInt(secLabel, 10)) return match;
      const total = parseInt(m, 10) * 60 + parseInt(ss, 10);
      return `[${formatBracketTimestamp(total)}] `;
    },
  );

  return out;
}

/** Newline-separated YouTube UI: `0:22` / `22 seconds` / text → one bracket line. */
function mergeNewlineSeparatedYoutubeCues(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const clock = lines[i]?.match(/^\s*(\d+):(\d{2})(?::(\d{2}))?\s*$/);
    if (clock) {
      const next = lines[i + 1]?.trim() ?? "";
      const secOnly = next.match(/^(\d{1,2})\s*seconds?$/i);
      const minSec = next.match(/^(\d+)\s*minute,?\s*(\d+)\s*seconds?$/i);
      const bodyLine = lines[i + 2] ?? "";
      if (secOnly && parseInt(clock[2], 10) === parseInt(secOnly[1], 10)) {
        const h = clock[3] != null ? parseInt(clock[1], 10) : 0;
        const m = clock[3] != null ? parseInt(clock[2], 10) : parseInt(clock[1], 10);
        const s = clock[3] != null ? parseInt(clock[3], 10) : parseInt(clock[2], 10);
        const total = h * 3600 + m * 60 + s;
        out.push(`[${formatBracketTimestamp(total)}] ${collapseInlineWhitespace(bodyLine)}`);
        i += 3;
        continue;
      }
      if (minSec && parseInt(clock[1], 10) === parseInt(minSec[1], 10) && parseInt(clock[2], 10) === parseInt(minSec[2], 10)) {
        const total = parseInt(clock[1], 10) * 60 + parseInt(clock[2], 10);
        out.push(`[${formatBracketTimestamp(total)}] ${collapseInlineWhitespace(bodyLine)}`);
        i += 3;
        continue;
      }
    }
    out.push(lines[i] ?? "");
    i += 1;
  }
  return out.join("\n");
}

function normalizeBracketLine(line: string): string {
  const m = line.match(/^(\s*)\[([^\]]+)\]\s*(.*)$/s);
  if (!m) return collapseInlineWhitespace(line);
  const inner = m[2].trim();
  const dashIdx = inner.indexOf("-");
  const clockPart = (dashIdx === -1 ? inner : inner.slice(0, dashIdx)).trim();
  const rangeSuffix = dashIdx === -1 ? "" : inner.slice(dashIdx);
  let label = inner;
  if (BRACKET_TIMESTAMP_INNER_RE.test(clockPart)) {
    const secs = timestampToSeconds(clockPart);
    if (secs != null) {
      label = rangeSuffix ? `${formatBracketTimestamp(secs)}${rangeSuffix}` : formatBracketTimestamp(secs);
    }
  }
  const body = collapseInlineWhitespace(m[3]);
  return body ? `${m[1]}[${label}] ${body}` : `${m[1]}[${label}]`;
}

function splitPreservingParagraphs(text: string): string[] {
  return text.split(/(\n{2,})/);
}

/**
 * Normalize pasted transcript text for storage and analysis.
 * Idempotent for text that is already in `[M:SS] text` form.
 */
export function normalizePastedTranscript(raw: string): string {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  let text = trimmed;
  if (looksLikeYoutubeShowTranscriptPaste(text)) {
    text = fixYoutubeMashedTimestamps(text);
    if (/\n\s*\d+:\d{2}\s*\n\s*\d+\s*seconds?/i.test(text)) {
      text = mergeNewlineSeparatedYoutubeCues(text);
    }
  }

  const parts = splitPreservingParagraphs(text);
  const normalizedParts = parts.map((part) => {
    if (/^\n{2,}$/.test(part)) return "\n\n";
    return part
      .split("\n")
      .map((line) => (line.trim() === "" ? "" : normalizeBracketLine(line)))
      .join("\n");
  });

  return normalizedParts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Count lines that start with a timed bracket (after normalization). */
export function countTimedTranscriptLines(text: string): number {
  return text.split("\n").filter((line) => /^\s*\[\d{1,2}:\d{2}/.test(line)).length;
}
