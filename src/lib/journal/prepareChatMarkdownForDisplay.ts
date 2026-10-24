import { sanitizeResearchChatContent } from "@/lib/journal/sanitizeResearchChatContent";

const ABBREV_DOT = "%%DOT%%";

/** Strip cites, then normalize paragraph/list breaks so markdown renders readable blocks. */
export function prepareChatMarkdownForDisplay(text: string): string {
  let out = sanitizeResearchChatContent(text);
  if (!out) return out;
  out = normalizeSectionDividers(out);
  out = normalizeQuotedPrayers(out);
  out = mergeSplitBlockquotes(out);
  out = normalizeInlineLists(out);
  out = normalizeTransitionBreaks(out);
  out = normalizeClosingQuestions(out);
  out = ensureParagraphBreaks(out);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Split inline --- AI: / --- You: dumps onto their own blocks. */
function normalizeSectionDividers(text: string): string {
  return text
    .replace(/\s+---\s+(?=(?:AI|You)\s*:)/gi, "\n\n--- ")
    .replace(/\s+---\s+/g, "\n\n---\n\n");
}

/** Merge consecutive blockquote blocks into one written prayer (fixes split green boxes). */
function mergeSplitBlockquotes(text: string): string {
  const parts = text.split(/\n{2,}/);
  const out: string[] = [];
  let quoteLines: string[] = [];

  const flushQuote = () => {
    if (!quoteLines.length) return;
    const body = quoteLines
      .map((chunk) => chunk.replace(/^(?:>\s*)+/gm, "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (body) out.push(`> ${body}`);
    quoteLines = [];
  };

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (/^>\s/m.test(trimmed)) {
      quoteLines.push(trimmed);
      continue;
    }
    flushQuote();
    out.push(trimmed);
  }
  flushQuote();
  return out.join("\n\n");
}

/** Turn quoted prayers into one continuous green blockquote (written prayer). */
function normalizeQuotedPrayers(text: string): string {
  return text.replace(/"([^"\n]{60,})"/g, (_match, inner: string) => {
    const prayer = inner.trim().replace(/\s+/g, " ");
    return `\n\n> ${prayer}\n\n`;
  });
}

/** Break before reflective closing questions (common in My AI replies). */
function normalizeClosingQuestions(text: string): string {
  return text.replace(
    /([.!?"\u201d])\s+(?=(?:As you (?:think|consider|reflect|prepare|move)|What (?:feels|would|is)|How (?:does|do|might|would)|When you |Where do you |Which ))/gi,
    "$1\n\n",
  );
}

/** Insert breaks before common section transitions mid-paragraph. */
function normalizeTransitionBreaks(text: string): string {
  return text.replace(
    /([.!?])\s+(?=(?:However|Similarly|In contrast|By contrast|Additionally|Furthermore|Moreover|Notably|Importantly|Historically|Biblically|Given (?:that|your)|It's (?:understandable|natural|common)|This (?:is|can be|may be)|The concept|This (?:idea|view|teaching|doctrine)|While many|Although|One (?:example|teacher|voice|scholar)|Another (?:example|teacher|voice|scholar)|First,|Second,|Third,|Finally,|In summary|To summarize|That said|On the other hand|In the charismatic|In Pentecostal|In the broader|Several (?:teachers|scholars|voices)|Many (?:teachers|scholars|voices)|Some (?:teachers|scholars|voices)|Here(?:'s| is)|You might|You could|Let's|Allow yourself|Take a moment|Before Caroline|As Caroline))/gi,
    "$1\n\n",
  );
}

function normalizeInlineLists(text: string): string {
  let out = text;
  out = joinSplitOrderedListMarkers(out);
  out = out.replace(/([.!?:])[ \t]+(?=[-*•]\s)/g, "$1\n\n");
  out = out.replace(/([.!?:])[ \t]+(?=\d+\.\s)/g, "$1\n\n");
  out = out.replace(/([.!?])[ \t]+([-*•])\s+/g, "$1\n\n$2 ");
  out = out.replace(/([.!?])\s+(?=\*\*[^*]+\*\*)/g, "$1\n\n");
  return out;
}

function joinSplitOrderedListMarkers(text: string): string {
  return text.replace(
    /(^|\n)([ \t]*\d+\.)[ \t]*(?:\n[ \t]*)+(?=(?!\d+\.[ \t]*(?:\n|$))\S)/g,
    "$1$2 ",
  );
}

const WALL_CHAR_THRESHOLD = 240;

function ensureParagraphBreaks(text: string): string {
  if (text.includes("\n\n")) {
    return text
      .split(/\n{2,}/)
      .map((block) => formatBlock(block))
      .filter(Boolean)
      .join("\n\n");
  }
  return formatBlock(text);
}

function formatBlock(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";
  if (isBlockquoteMarkdownBlock(trimmed)) return trimmed;
  if (looksLikeMarkdownBlock(trimmed)) return preserveMarkdownBlock(trimmed);
  if (trimmed.includes("\n")) {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => formatSingleLine(line))
      .join("\n\n");
  }
  return formatSingleLine(trimmed);
}

function formatSingleLine(line: string): string {
  if (looksLikeMarkdownLine(line)) return line;
  const sentences = splitSentences(line);
  if (sentences.length >= 2) {
    return oneSentencePerParagraph(line);
  }
  if (line.length > WALL_CHAR_THRESHOLD) {
    return oneSentencePerParagraph(line);
  }
  return line;
}

/** Keep lists, bold headings, and other markdown intact (no sentence splitting). */
function looksLikeMarkdownLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return (
    /\*\*/.test(trimmed) ||
    /^[-*+•]\s/.test(trimmed) ||
    /^\d+\.\s/.test(trimmed) ||
    /^#{1,6}\s/.test(trimmed) ||
    /^>\s/.test(trimmed)
  );
}

function looksLikeMarkdownBlock(text: string): boolean {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.some(looksLikeMarkdownLine);
}

function preserveMarkdownBlock(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** ChatGPT-style: one sentence per paragraph so each line breathes. */
function oneSentencePerParagraph(text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) return text;
  return sentences.join("\n\n");
}

function splitWallOfTextIntoParagraphs(text: string): string {
  return oneSentencePerParagraph(text);
}

function isBlockquoteMarkdownBlock(text: string): boolean {
  return /^>\s/m.test(text);
}

function splitSentences(text: string): string[] {
  const protectedText = text.replace(
    /\b(e\.g\.|i\.e\.|vs\.|Mr\.|Mrs\.|Ms\.|Dr\.|St\.)\b/gi,
    (match) => match.replace(/\./g, ABBREV_DOT),
  );
  const parts = protectedText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text];
  return parts
    .map((part) => part.replaceAll(ABBREV_DOT, ".").trim())
    .filter(Boolean);
}

/** Shared Tailwind prose classes for assistant chat markdown (My AI). */
export const CHAT_ASSISTANT_PROSE_CLASS =
  "prose prose-neutral max-w-none dark:prose-invert text-foreground " +
  "prose-p:my-0 prose-p:mb-6 prose-p:text-[15px] prose-p:leading-[1.85] prose-p:last:mb-0 " +
  "prose-li:my-2 prose-li:text-[15px] prose-li:leading-[1.85] " +
  "prose-ul:my-6 prose-ol:my-6 prose-ul:pl-5 prose-ol:pl-5 " +
  "prose-strong:font-semibold prose-headings:mb-3 prose-headings:mt-8 prose-headings:font-semibold prose-headings:first:mt-0 " +
  "prose-hr:my-8 prose-hr:border-border/60 " +
  "prose-blockquote:my-6 prose-blockquote:border-l-[3px] prose-blockquote:border-blue-500/35 prose-blockquote:bg-blue-500/[0.04] " +
  "prose-blockquote:py-2.5 prose-blockquote:pl-4 prose-blockquote:pr-2 prose-blockquote:not-italic prose-blockquote:text-[15px] prose-blockquote:leading-[1.85] " +
  "prose-blockquote:text-foreground/90 prose-blockquote:rounded-r-lg " +
  "[&_blockquote_p]:mb-4 [&_blockquote_p:last-child]:mb-0";

/** Compact variant for journal inline / chat surfaces. */
export const CHAT_ASSISTANT_PROSE_COMPACT =
  "prose prose-sm prose-neutral max-w-none dark:prose-invert text-foreground " +
  "prose-p:my-0 prose-p:mb-3 prose-p:text-[13px] prose-p:leading-[1.75] prose-p:last:mb-0 " +
  "prose-li:my-1 prose-li:text-[13px] prose-li:leading-[1.75] " +
  "prose-ul:my-2 prose-ol:my-2 prose-ul:pl-5 prose-ol:pl-5 " +
  "prose-strong:font-semibold prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold prose-headings:first:mt-0";

/** Claim research chat — ChatGPT-like spacing with compact type. */
export const CLAIM_RESEARCH_ASSISTANT_PROSE =
  "prose prose-xs max-w-none dark:prose-invert text-[11px] text-foreground " +
  "prose-p:my-0 prose-p:mb-2.5 prose-p:text-[11px] prose-p:leading-snug prose-p:last:mb-0 " +
  "prose-li:my-0.5 prose-li:text-[11px] prose-li:leading-snug " +
  "prose-ul:my-2 prose-ol:my-2 prose-ul:pl-4 prose-ol:pl-4 prose-ul:list-disc prose-ol:list-decimal " +
  "prose-strong:font-semibold prose-strong:text-foreground " +
  "prose-em:text-[11px] " +
  "prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-2.5 prose-blockquote:text-[11px] prose-blockquote:leading-snug prose-blockquote:text-muted-foreground prose-blockquote:not-italic " +
  "prose-headings:mb-1.5 prose-headings:mt-3 prose-headings:text-[11px] prose-headings:font-semibold prose-headings:leading-snug prose-headings:first:mt-0";
