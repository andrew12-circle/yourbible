const WHITESPACE = /\s/;

function isWhitespace(char: string | undefined): boolean {
  return char !== undefined && WHITESPACE.test(char);
}

function clampCaret(text: string, caretIndex: number): number {
  return Math.min(Math.max(0, caretIndex), text.length);
}

/** Start index of the word containing `pos`, or the next word if `pos` is on whitespace. */
function startOfWordAt(text: string, pos: number): number {
  let i = clampCaret(text, pos);
  if (i < text.length && isWhitespace(text[i])) {
    while (i < text.length && isWhitespace(text[i])) i++;
    return i;
  }
  while (i > 0 && !isWhitespace(text[i - 1])) i--;
  return i;
}

/** End index (exclusive) of the word starting at `wordStart`. */
function endOfWordAt(text: string, wordStart: number): number {
  let i = wordStart;
  while (i < text.length && !isWhitespace(text[i])) i++;
  return i;
}

/** Start index of the word immediately before `wordStart`. */
function startOfPreviousWord(text: string, wordStart: number): number {
  if (wordStart <= 0) return wordStart;
  let i = wordStart - 1;
  while (i >= 0 && isWhitespace(text[i])) i--;
  if (i < 0) return wordStart;
  while (i >= 0 && !isWhitespace(text[i])) i--;
  return i + 1;
}

export type PrivacyBlurSplit = {
  blurred: string;
  visible: string;
  blurredAfter: string;
};

/**
 * Split text for shoulder-surfing privacy: blur everything except the last
 * completed word and the word at the caret (max ~2 words visible).
 */
export function splitTextForPrivacyBlur(text: string, caretIndex: number): PrivacyBlurSplit {
  if (!text) {
    return { blurred: "", visible: "", blurredAfter: "" };
  }

  const pos = clampCaret(text, caretIndex);
  const currentStart = startOfWordAt(text, pos);
  const currentEnd = endOfWordAt(text, currentStart);
  const prevStart = startOfPreviousWord(text, currentStart);

  const visibleStart = prevStart < currentStart ? prevStart : currentStart;
  const visibleEnd = currentEnd;

  return {
    blurred: text.slice(0, visibleStart),
    visible: text.slice(visibleStart, visibleEnd),
    blurredAfter: text.slice(visibleEnd),
  };
}
