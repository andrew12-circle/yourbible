import type { ReaderLayoutFingerprintInput } from "@/lib/ink/types";

/** Stable hash for pagination + typography settings (ink is keyed per fingerprint). */
export function computeReaderLayoutFingerprint(input: ReaderLayoutFingerprintInput): string {
  const payload = [
    input.bibleId,
    input.fontScale.toFixed(3),
    Math.round(input.pageWidth),
    Math.round(input.pageHeight),
    input.singlePage ? "1" : "0",
  ].join("|");
  return fnv1a(payload);
}

function fnv1a(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function readerInkStorageKey(
  fingerprint: string,
  book: string,
  chapter: number,
  pageIndex: number,
  side: string,
): string {
  return `yb.reader.ink.${fingerprint}.${book}.${chapter}.${pageIndex}.${side}`;
}

export const LS_READER_INK_MODE = "yb.reader.inkMode";
