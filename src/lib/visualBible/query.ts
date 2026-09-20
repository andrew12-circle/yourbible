import { BOOKS } from "@/data/books";
import type { VisualAsset, VisualKind, VisualPassage } from "@/data/visualBible/types";

export const VISUAL_PAGE_SIZE = 24;
export function normalizeVisualText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function passageLabel(passage: VisualPassage): string {
  const book = BOOKS.find((item) => item.abbr === passage.book)?.name ?? passage.book;
  const chapters = passage.endChapter && passage.endChapter !== passage.chapter ? `${passage.chapter}–${passage.endChapter}` : String(passage.chapter);
  const verses = passage.verse ? `:${passage.verse}${passage.endVerse && passage.endVerse !== passage.verse ? `–${passage.endVerse}` : ""}` : "";
  return `${book} ${chapters}${verses}`;
}
export function passageMatches(passage: VisualPassage, book: string, chapter?: number): boolean {
  return passage.book === book && (chapter === undefined || (Number.isInteger(chapter) && chapter >= passage.chapter && chapter <= (passage.endChapter ?? passage.chapter)));
}
export interface VisualFilters { query?: string; kind?: VisualKind | "all"; book?: string; chapter?: number; creator?: string; source?: string; }
export function filterVisuals(assets: readonly VisualAsset[], filters: VisualFilters = {}): VisualAsset[] {
  const words = normalizeVisualText(filters.query ?? "").split(" ").filter(Boolean);
  return assets.filter((asset) => {
    if (filters.kind && filters.kind !== "all" && asset.kind !== filters.kind) return false;
    if (filters.book && !asset.passages.some((p) => passageMatches(p, filters.book!, filters.chapter))) return false;
    if (filters.creator && asset.creator !== filters.creator) return false;
    if (filters.source && asset.source.name !== filters.source) return false;
    if (!words.length) return true;
    const text = normalizeVisualText([asset.title, asset.creator, asset.date, asset.culture, asset.medium, asset.source.name, ...asset.tags, ...asset.passages.flatMap((p) => [passageLabel(p), `${p.book} ${p.chapter}`])].join(" "));
    return words.every((word) => text.includes(word));
  });
}
export function visualPage(assets: readonly VisualAsset[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(assets.length / VISUAL_PAGE_SIZE));
  const page = Math.max(1, Math.min(pageCount, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  return { page, pageCount, items: assets.slice((page - 1) * VISUAL_PAGE_SIZE, page * VISUAL_PAGE_SIZE) };
}
/** Dedupe source identities, not titles: two artists can paint the same subject. */
export function deduplicateVisuals(assets: readonly VisualAsset[]): VisualAsset[] {
  const grouped = new Map<string, VisualAsset>();
  for (const asset of assets) {
    let sourceKey = asset.source.url || asset.id;
    try { sourceKey = decodeURIComponent(sourceKey).replace(/_/g, " "); } catch { /* Preserve the original key when a legacy URL cannot be decoded. */ }
    const key = `${asset.kind}:${sourceKey}`;
    const previous = grouped.get(key);
    if (!previous) { grouped.set(key, { ...asset, passages: [...asset.passages] }); continue; }
    for (const passage of asset.passages) {
      const identity = (p: VisualPassage) => `${p.book}:${p.chapter}:${p.endChapter ?? p.chapter}:${p.verse ?? ""}:${p.endVerse ?? ""}:${p.relationship}`;
      if (!previous.passages.some((p) => identity(p) === identity(passage))) previous.passages.push(passage);
    }
  }
  return [...grouped.values()];
}
