import { readerInkStorageKey } from "@/lib/ink/layoutFingerprint";
import type { StoredInkStroke } from "@/lib/ink/types";

type LocalInkPayload = {
  fingerprint: string;
  strokes: StoredInkStroke[];
  updatedAt: string;
};

export function loadLocalReaderInk(
  fingerprint: string,
  book: string,
  chapter: number,
  pageIndex: number,
  side: string,
): StoredInkStroke[] | null {
  try {
    const raw = localStorage.getItem(
      readerInkStorageKey(fingerprint, book, chapter, pageIndex, side),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalInkPayload;
    if (!Array.isArray(parsed.strokes)) return null;
    return parsed.strokes;
  } catch {
    return null;
  }
}

export function saveLocalReaderInk(
  fingerprint: string,
  book: string,
  chapter: number,
  pageIndex: number,
  side: string,
  strokes: StoredInkStroke[],
): void {
  try {
    const payload: LocalInkPayload = {
      fingerprint,
      strokes,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      readerInkStorageKey(fingerprint, book, chapter, pageIndex, side),
      JSON.stringify(payload),
    );
  } catch {
    /* quota */
  }
}

export function listLocalInkFingerprintsForPage(
  book: string,
  chapter: number,
  pageIndex: number,
  side: string,
): string[] {
  const prefix = `yb.reader.ink.`;
  const suffix = `.${book}.${chapter}.${pageIndex}.${side}`;
  const found: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix) || !key.endsWith(suffix)) continue;
      const fp = key.slice(prefix.length, key.length - suffix.length);
      if (fp) found.push(fp);
    }
  } catch {
    /* noop */
  }
  return found;
}
