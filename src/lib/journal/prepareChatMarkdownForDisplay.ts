import { sanitizeResearchChatContent } from "@/lib/journal/sanitizeResearchChatContent";

const ABBREV_DOT = "%%DOT%%";

/** Strip cites, then normalize paragraph/list breaks so markdown renders readable blocks. */
export function prepareChatMarkdownForDisplay(text: string): string {
  let out = sanitizeResearchChatContent(text);
  if (!out) return out;
  out = normalizeInlineLists(out);
  out = normalizeTransitionBreaks(out);
  out = ensureParagraphBreaks(out);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Insert breaks before common section transitions mid-paragraph. */
function normalizeTransitionBreaks(text: string): string {
  return text.replace(
    /([.!?])\s+(?=(?:However|Similarly|In contrast|By contrast|Additionally|Furthermore|Moreover|Notably|Importantly|Historically|Biblically|The concept|This (?:idea|view|teaching|doctrine)|While many|Although|One (?:example|teacher|voice|scholar)|Another (?:example|teacher|voice|scholar)|First,|Second,|Third,|Finally,|In summary|To summarize|That said|On the other hand|In the charismatic|In Pentecostal|In the broader|Several (?:teachers|scholars|voices)|Many (?:teachers|scholars|voices)|Some (?:teachers|scholars|voices)))/gi,
    "$1\n\n",
  );
}

function normalizeInlineLists(text: string): string {
  let out = text;
  out = out.replace(/([.!?:])\s+(?=[-*•]\s)/g, "$1\n\n");
  out = out.replace(/([.!?:])\s+(?=\d+\.\s)/g, "$1\n\n");
  out = out.replace(/([.!?])\s+([-*•])\s+/g, "$1\n\n$2 ");
  out = out.replace(/([.!?])\s+(?=\*\*[^*]+\*\*)/g, "$1\n\n");
  return out;
}

const WALL_CHAR_THRESHOLD = 240;
const MIN_SPLIT_CHARS = 80;

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
  const sentences = splitSentences(line);
  if (sentences.length >= 2 && line.length >= MIN_SPLIT_CHARS) {
    return splitWallOfTextIntoParagraphs(line);
  }
  if (line.length > WALL_CHAR_THRESHOLD) {
    return splitWallOfTextIntoParagraphs(line);
  }
  return line;
}

function splitWallOfTextIntoParagraphs(text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) return text;

  const paragraphs: string[] = [];
  let buf: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    buf.push(sentence);
    const next = sentences[i + 1];
    const trimmed = sentence.trim();
    const endsQuestion = trimmed.endsWith("?");
    const endsTerminal = /[.!]$/.test(trimmed);
    const nextStartsList = next ? /^[-*•]|\d+\./.test(next.trim()) : false;

    const shouldBreak =
      Boolean(next) &&
      (buf.length >= 2 ||
        nextStartsList ||
        endsQuestion ||
        (endsTerminal && buf.length >= 1));

    if (shouldBreak) {
      paragraphs.push(buf.join(" "));
      buf = [];
    }
  }

  if (buf.length) paragraphs.push(buf.join(" "));
  return paragraphs.join("\n\n");
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
  "prose-p:my-0 prose-p:mb-4 prose-p:text-[15px] prose-p:leading-[1.75] prose-p:last:mb-0 " +
  "prose-li:my-1 prose-li:text-[15px] prose-li:leading-[1.75] " +
  "prose-ul:my-3 prose-ol:my-3 prose-ul:pl-5 prose-ol:pl-5 " +
  "prose-strong:font-semibold prose-headings:mb-2 prose-headings:mt-6 prose-headings:font-semibold prose-headings:first:mt-0";

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
