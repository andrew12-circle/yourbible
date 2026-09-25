import type { VisualAsset } from "@/data/visualBible/types";
import { filterVisuals, normalizeVisualText, passageMatches } from "./query";
import { filterCollection, type CollectionFilter } from "./collections";
import { extractVisualReference } from "./referenceSearch";
import { filterGeographyPlaces, geographyBookNumber, geographyReferences, type GeographyPlace, type GeographyTranslation } from "@/lib/bible/geography";

export const EXPLORER_SECTIONS = [
  { id: "discover", label: "Discover", description: "A visual companion to your reading" },
  { id: "art", label: "Art gallery", description: "Paintings, prints and sacred art" },
  { id: "maps", label: "Maps & plans", description: "Historical maps and reconstructions" },
  { id: "places", label: "Places on Earth", description: "Explore locations in Google Earth or Maps" },
  { id: "objects", label: "Objects & manuscripts", description: "Material culture and the written text" },
  { id: "collections", label: "Curated collections", description: "Browse by collection" },
  { id: "saved", label: "Saved", description: "Your favorites on this device" },
] as const;
export type ExplorerSection = typeof EXPLORER_SECTIONS[number]["id"];
export interface ExplorerFilters {
  section: ExplorerSection; query: string; book?: string; chapter?: number;
  collection: CollectionFilter; creator: string; period: string; saved: readonly string[];
}
export function explorerVisuals(assets: readonly VisualAsset[], filters: ExplorerFilters): VisualAsset[] {
  const filtered = filterVisuals(filterCollection(assets, filters.collection, filters.period), {
    query: filters.query, book: filters.book, chapter: filters.chapter, creator: filters.creator,
  }).filter(asset => {
    switch (filters.section) {
      case "art": return asset.kind === "artwork";
      case "maps": return ["map", "architecture", "timeline"].includes(asset.kind);
      case "objects": return ["artifact", "manuscript"].includes(asset.kind);
      case "places": return asset.kind === "place-photo";
      case "saved": return filters.saved.includes(`visual:${asset.id}`);
      default: return true;
    }
  });
  const exact = (asset: VisualAsset) => Boolean(filters.book && asset.passages.some(p => passageMatches(p, filters.book!, filters.chapter) && p.chapter === filters.chapter && (!p.endChapter || p.endChapter === p.chapter)));
  return filtered.sort((a, b) => Number(exact(b)) - Number(exact(a))
    || Number(Boolean(b.iconic)) - Number(Boolean(a.iconic))
    || Number(a.review === "legacy") - Number(b.review === "legacy")
    || (a.readerRank ?? 50) - (b.readerRank ?? 50) || a.title.localeCompare(b.title));
}
export function explorerPlaces(places: GeographyPlace[], query: string, book: string | undefined, chapter: number | undefined, translation: GeographyTranslation): GeographyPlace[] {
  const { text, reference } = extractVisualReference(query);
  if (reference && !reference.valid) return [];
  const bookNumber = geographyBookNumber(book);
  if (book && bookNumber === null) return [];
  const matches = filterGeographyPlaces(places, { book: bookNumber, chapter: chapter ?? null, verses: null, query: text, translation });
  if (!reference) return matches;
  const targetBook = geographyBookNumber(reference.book);
  return matches.filter(place => geographyReferences(place, translation).some(ref => ref.b === targetBook
    && ref.c >= reference.chapter && ref.c <= reference.endChapter
    && (ref.c !== reference.chapter || ref.v >= reference.verse)
    && (ref.c !== reference.endChapter || ref.v <= reference.endVerse)));
}
/** A title-based illustration match never supplies or changes coordinates. */
export function placeIllustration(place: GeographyPlace, assets: readonly VisualAsset[]): VisualAsset | undefined {
  const names = [place.name, ...place.aliases].map(normalizeVisualText).filter(name => name.length >= 5);
  return assets.find(asset => asset.kind === "place-photo" && names.some(name => ` ${normalizeVisualText(asset.title)} `.includes(` ${name} `)));
}
export function savedVisualKey(ownerId?: string): string {
  return `yourbible:visual-saved:v1:${ownerId || "guest"}`;
}
export function parseSavedVisuals(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string" && /^(visual|place):[a-zA-Z0-9:_-]{1,180}$/.test(id)))].slice(0, 2000);
  } catch { return []; }
}
