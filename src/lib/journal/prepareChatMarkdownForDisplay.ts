import { sanitizeResearchChatContent } from "@/lib/journal/sanitizeResearchChatContent";

const ABBREV_DOT = "%%DOT%%";

/** Strip cites, then normalize paragraph/list breaks so markdown renders readable blocks. */
export function prepareChatMarkdownForDisplay(text: string): string {
  let out = sanitizeResearchChatContent(text);
  if (!out) return out;
  out = normalizeInlineLists(out);
  out = ensureParagraphBreaks(out);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeInlineLists(text: string): string {
  let out = text;
  out = out.replace(/([.!?:])\s+(?=[-*•]\s)/g, "$1\n\n");
  out = out.replace(/([.!?:])\s+(?=\d+\.\s)/g, "$1\n\n");
  out = out.replace(/([.!?])\s+([-*•])\s+/g, "$1\n\n$2 ");
  return out;
}

function ensureParagraphBreaks(text: string): string {
  if (text.includes("\n\n")) return text;
  if (text.includes("\n")) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n\n");
  }
  return splitWallOfTextIntoParagraphs(text);
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
      (buf.length >= 3 ||
        nextStartsList ||
        (endsQuestion && buf.length >= 1) ||
        (endsTerminal && buf.length >= 2));

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
