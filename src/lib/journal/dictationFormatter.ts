/**
 * Local dictation → readable journal prose. No network, no AI — runs entirely on device.
 * Safe to use with E2E encryption: plaintext never leaves the client for formatting.
 */

import { scrubTranscriptProfanity } from "@/lib/journal/scrubTranscriptProfanity";

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

const MIN_PARAGRAPH_SEGMENT = 40;
const MIN_SENTENCE_SEGMENT = 28;
const AUTO_PARAGRAPH_SENTENCES = 3;
const AUTO_PARAGRAPH_MIN_CHARS = 120;

function capitalizeFirst(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * STT often mirrors caps-lock notes or returns shouting case. When most letters are
 * uppercase, normalize to lowercase before sentence/paragraph formatting.
 */
const SHOUTING_ACRONYMS = new Set([
  "usa",
  "uk",
  "eu",
  "un",
  "nato",
  "fbi",
  "cia",
  "abc",
  "nbc",
  "cbs",
  "pbs",
  "tv",
  "am",
  "pm",
  "ad",
  "bc",
  "st",
  "dr",
  "mr",
  "mrs",
  "ms",
]);

export function normalizeShoutingCase(text: string): string {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return text;
  const upper = (letters.match(/[A-Z]/g) ?? []).length;
  if (upper / letters.length < 0.65) return text;

  const lower = text.toLowerCase();
  return lower.replace(/\b([a-z]{2,4})\b/gi, (word) =>
    SHOUTING_ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word,
  );
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

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [normalized];
}

/** Break long monologues into readable paragraphs when pivot words are absent. */
function autoParagraphBreaks(text: string): string {
  if (text.includes("\n\n") || text.length < AUTO_PARAGRAPH_MIN_CHARS) return text;
  const sentences = splitSentences(text);
  if (sentences.length <= AUTO_PARAGRAPH_SENTENCES) return text;
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += AUTO_PARAGRAPH_SENTENCES) {
    paragraphs.push(sentences.slice(i, i + AUTO_PARAGRAPH_SENTENCES).join(" "));
  }
  return paragraphs.filter(Boolean).join("\n\n");
}

function formatParagraphs(text: string): string {
  const blocks = splitLongChunk(text, PARAGRAPH_PIVOTS, MIN_PARAGRAPH_SEGMENT);
  if (blocks.length <= 1) {
    const formatted = formatSentences(blocks[0] ?? text);
    return autoParagraphBreaks(formatted);
  }
  return blocks.map((b) => autoParagraphBreaks(formatSentences(b))).filter(Boolean).join("\n\n");
}

/** Format raw speech-to-text into punctuated journal prose (device-only). */
export function formatDictatedJournalText(text: string): string {
  let s = scrubTranscriptProfanity(normalizeShoutingCase(text.trim()));
  if (!s) return "";

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
