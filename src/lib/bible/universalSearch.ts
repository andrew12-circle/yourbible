import { BOOKS, type BibleBook } from "@/data/books";

export type UniversalVisualSection = "discover" | "art" | "maps" | "places" | "objects";

export function bibleHubSearchUrl(query: string): string {
  const q = query.trim();
  return q ? `https://biblehub.com/search.php?q=${encodeURIComponent(q)}` : "https://biblehub.com/search.htm";
}

export function universalEarthHref(query: string): string {
  const q = query.trim();
  return q ? `/bible/earth?q=${encodeURIComponent(q)}` : "/bible/earth";
}

export function universalVisualHref(
  query: string,
  section: UniversalVisualSection = "discover",
  visualId?: string,
): string {
  const params = new URLSearchParams();
  const q = query.trim();
  if (section !== "discover") params.set("section", section);
  if (q) params.set("q", q);
  if (visualId) params.set("visual", visualId);
  const suffix = params.toString();
  return suffix ? `/bible/explore?${suffix}` : "/bible/explore";
}

export function universalLifeGuideHref(query: string): string {
  const q = query.trim();
  return q ? `/bible/life-guide?q=${encodeURIComponent(q)}` : "/bible/life-guide";
}

export function visualSectionForKind(kind: string): UniversalVisualSection {
  if (kind === "artwork") return "art";
  if (kind === "place-photo") return "places";
  if (kind === "map" || kind === "architecture" || kind === "timeline") return "maps";
  if (kind === "artifact" || kind === "manuscript") return "objects";
  return "discover";
}

export function matchingBibleBooks(query: string, limit = 4): BibleBook[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return BOOKS
    .map((book) => {
      const name = book.name.toLowerCase();
      const abbr = book.abbr.toLowerCase();
      const exact = Number(name === q || abbr === q);
      const prefix = Number(name.startsWith(q) || abbr.startsWith(q));
      const contains = Number(name.includes(q) || abbr.includes(q));
      return { book, score: exact * 100 + prefix * 20 + contains * 5 };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.book.name.localeCompare(b.book.name))
    .slice(0, limit)
    .map((row) => row.book);
}
