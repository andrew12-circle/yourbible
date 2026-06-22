/**
 * Local dictation → readable journal prose. No network, no AI — runs entirely on device.
 * Safe to use with E2E encryption: plaintext never leaves the client for formatting.
 */

const SPOKEN_PUNCTUATION: [RegExp, string][] = [
  [/\s+new\s+paragraph\s+/gi, "\n\n"],
  [/\s+new\s+line\s+/gi, "\n"],
  [/[ \t]+question\s+mark\b/gi, "? "],
  [/[ \t]+exclamation\s+(?:point|mark)\b/gi, "! "],
  [/[ \t]+period\b/gi, ". "],
  [/[ \t]+comma\b/gi, ", "],
  [/[ \t]+colon\b/gi, ": "],
  [/[ \t]+semicolon\b/gi, "; "],
];

/** Topic / prayer pivots — start a new paragraph when the prior chunk is long enough. */
const PARAGRAPH_PIVOTS =
  /\s+(and then|so then|but then|however|also|because|when i |when we |when they |lord |father |god |jesus |holy spirit |dear lord |help me |give me |thank you |i pray |i need |i want |i feel |today i |tonight i )\s+/gi;

const SENTENCE_PIVOTS =
  /\s+(and then|but |so |because |although |though |while |when |if |after |before )\s+/gi;

const MIN_PARAGRAPH_SEGMENT = 72;
const MIN_SENTENCE_SEGMENT = 48;

function capitalizeFirst(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function ensureTerminalPunctuation(s: string): string {
  const t = s.trim();
  if (!t) return "";
  if (/[.!?…]$/.test(t)) return t;
  if (/\?$/.test(t.trim()) || /^(who|what|when|where|why|how|is|are|do|does|did|can|could|would|will)\b/i.test(t)) {
    return t.endsWith("?") ? t : `${t}?`;
  }
  return `${t}.`;
}

function splitLongChunk(chunk: string, pivotRe: RegExp, minLen: number): string[] {
  const s = chunk.trim().replace(/\s+/g, " ");
  if (s.length < minLen) return [s];

  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(pivotRe.source, pivotRe.flags);
  while ((m = re.exec(s)) !== null) {
    const idx = m.index;
    const segment = s.slice(last, idx).trim();
    if (segment.length >= minLen) {
      parts.push(segment);
      last = idx + m[0].length;
    }
  }
  const tail = s.slice(last).trim();
  if (parts.length === 0) return tail ? [tail] : [];
  if (tail) parts.push(tail);
  return parts;
}

function formatSentences(block: string): string {
  const pieces = splitLongChunk(block, SENTENCE_PIVOTS, MIN_SENTENCE_SEGMENT);
  return pieces
    .map((p) => capitalizeFirst(ensureTerminalPunctuation(p)))
    .filter(Boolean)
    .join(" ");
}

function formatParagraphs(text: string): string {
  const blocks = splitLongChunk(text, PARAGRAPH_PIVOTS, MIN_PARAGRAPH_SEGMENT);
  if (blocks.length <= 1) return formatSentences(blocks[0] ?? text);
  return blocks.map((b) => formatSentences(b)).filter(Boolean).join("\n\n");
}

/** Format raw speech-to-text into punctuated journal prose (device-only). */
export function formatDictatedJournalText(text: string): string {
  let s = text.trim();
  if (!s) return text;

  for (const [re, replacement] of SPOKEN_PUNCTUATION) {
    s = s.replace(re, replacement);
  }

  // Collapse spaces within lines; keep explicit paragraph / line breaks from spoken commands.
  s = s
    .split(/\n\n+/)
    .map((block) => block.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

  // Respect explicit newlines from spoken "new paragraph" / "new line".
  const blocks = s.split(/\n\n+/).map((b) => b.replace(/\n/g, " ").trim()).filter(Boolean);
  if (blocks.length > 1) {
    return blocks.map((b) => formatParagraphs(b)).join("\n\n");
  }

  return formatParagraphs(s);
}

/** @deprecated Use formatDictatedJournalText */
export const formatDictatedTextLocally = formatDictatedJournalText;
