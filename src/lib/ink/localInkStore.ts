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

/** Load ink for the current layout fingerprint, or migrate the newest local blob from another fingerprint. */
export function loadBestLocalReaderInk(
  fingerprint: string,
  book: string,
  chapter: number,
  pageIndex: number,
  side: string,
): StoredInkStroke[] | null {
  const current = loadLocalReaderInk(fingerprint, book, chapter, pageIndex, side);
  if (current && current.length > 0) return current;

  const others = listLocalInkFingerprintsForPage(book, chapter, pageIndex, side).filter(
    (fp) => fp !== fingerprint,
  );
  let best: { strokes: StoredInkStroke[]; updatedAt: string } | null = null;

  for (const fp of others) {
    try {
      const raw = localStorage.getItem(readerInkStorageKey(fp, book, chapter, pageIndex, side));
      if (!raw) continue;
      const parsed = JSON.parse(raw) as LocalInkPayload;
      if (!Array.isArray(parsed.strokes) || parsed.strokes.length === 0) continue;
      const updatedAt = parsed.updatedAt ?? "";
      if (!best || updatedAt > best.updatedAt) {
        best = { strokes: parsed.strokes, updatedAt };
      }
    } catch {
      /* skip corrupt entry */
    }
  }

  if (!best) return current;

  saveLocalReaderInk(fingerprint, book, chapter, pageIndex, side, best.strokes);
  return best.strokes;
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

/** Remove all cached reader ink blobs for a chapter (every page / side / layout). */
export function clearAllLocalReaderInkForChapter(book: string, chapter: number): void {
  const needle = `.${book}.${chapter}.`;
  const keysToRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("yb.reader.ink.") && key.includes(needle)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}
