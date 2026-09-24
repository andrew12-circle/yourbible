import { z } from "zod";
import { BOOKS } from "@/data/books";

export const GEOGRAPHY_TRANSLATIONS = ["csb", "esv", "kjv", "leb", "nasb", "net", "niv", "nkjv", "nlt", "nrsv"] as const;
export type GeographyTranslation = (typeof GEOGRAPHY_TRANSLATIONS)[number] | "all";
// The upstream includes negative evidence scores; retain rather than clamp them.
const sourceScore = z.number().finite().nullable();
const verseTuple = z.tuple([z.number().int().min(1).max(66), z.number().int().min(1).max(150), z.number().int().min(1).max(176)]);
const candidateSchema = z.object({
  id: z.string(), modernId: z.string(), name: z.string(), description: z.string(),
  lon: z.number().finite().min(-180).max(180), lat: z.number().finite().min(-90).max(90),
  coordinateKind: z.string(), score: sourceScore,
  radiusMeters: z.number().finite().nonnegative().nullable(), geometryId: z.string().nullable(),
});
const referenceSchema = z.object({
  b: z.number().int().min(1).max(66), c: z.number().int().min(1).max(150), v: z.number().int().min(1).max(176),
  t: z.number().int().min(0).max(1023), a: z.record(verseTuple).optional(),
});
const placeSchema = z.object({
  id: z.string().regex(/^a[0-9a-f]{6}$/), name: z.string(), aliases: z.array(z.string()), type: z.string(),
  sourceUrl: z.string().url().refine((url) => url.startsWith("https://www.openbible.info/geo/ancient/")),
  notes: z.string(), geojsonFile: z.string().nullable(),
  candidates: z.array(candidateSchema),
  unresolved: z.array(z.object({ kind: z.string(), description: z.string(), score: sourceScore })),
  references: z.array(referenceSchema),
});
export const geographyAtlasSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.object({ name: z.string(), url: z.string().url(), commit: z.string(), sourceDate: z.string(), license: z.string(), licenseUrl: z.string().url(), notice: z.string() }),
  translations: z.array(z.string()), places: z.array(placeSchema),
});
export type GeographyAtlas = z.infer<typeof geographyAtlasSchema>;
export type GeographyPlace = z.infer<typeof placeSchema>;
export type GeographyCandidate = z.infer<typeof candidateSchema>;
export type GeographyReference = { b: number; c: number; v: number };
export interface GeographyFilter {
  book: number | null; chapter: number | null; verses: [number, number] | null;
  translation: GeographyTranslation; query: string;
}
export function geographyBookNumber(book: string | undefined): number | null {
  if (!book) return null;
  const normalized = book.toLowerCase().replace(/[^a-z0-9]/g, "");
  const index = BOOKS.findIndex((entry) => [entry.abbr, entry.name].some((name) => name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized));
  return index < 0 ? null : index + 1;
}
export function geographyTranslation(abbreviation?: string): GeographyTranslation {
  const normalized = abbreviation?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  if (normalized.startsWith("csb")) return "csb";
  return GEOGRAPHY_TRANSLATIONS.find((name) => name === normalized) ?? "all";
}
export function parseGeographyVerseRange(value: string): [number, number] | null {
  if (!value.trim()) return null;
  const match = value.trim().match(/^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/);
  if (!match) throw new Error("Use a verse number or range, such as 7 or 1–12.");
  const start = Number(match[1]), end = Number(match[2] ?? match[1]);
  if (start < 1 || end < start || end > 176) throw new Error("Use an ascending verse range between 1 and 176.");
  return [start, end];
}
export function geographyReferences(place: GeographyPlace, translation: GeographyTranslation): GeographyReference[] {
  const bit = translation === "all" ? -1 : GEOGRAPHY_TRANSLATIONS.indexOf(translation);
  const result = new Map<string, GeographyReference>();
  for (const reference of place.references) {
    if (bit >= 0 && !(reference.t & (1 << bit))) continue;
    const alternate = translation !== "all" ? reference.a?.[translation] : undefined;
    const [b, c, v] = alternate ?? [reference.b, reference.c, reference.v];
    result.set(`${b}.${c}.${v}`, { b, c, v });
  }
  return [...result.values()].sort((a, b) => a.b - b.b || a.c - b.c || a.v - b.v);
}
export function geographyReferenceMatches(reference: GeographyReference, filter: GeographyFilter): boolean {
  return (filter.book === null || reference.b === filter.book)
    && (filter.chapter === null || reference.c === filter.chapter)
    && (filter.verses === null || (reference.v >= filter.verses[0] && reference.v <= filter.verses[1]));
}
function searchable(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function filterGeographyPlaces(places: GeographyPlace[], filter: GeographyFilter): GeographyPlace[] {
  const terms = searchable(filter.query).split(" ").filter(Boolean);
  return places.filter((place) => {
    const haystack = searchable([place.name, place.type, ...place.aliases, ...place.candidates.map((candidate) => candidate.name)].join(" "));
    if (!terms.every((term) => haystack.includes(term))) return false;
    if (filter.book === null && filter.chapter === null && filter.verses === null && filter.translation === "all") return true;
    return geographyReferences(place, filter.translation).some((reference) => geographyReferenceMatches(reference, filter));
  }).sort((a, b) => {
    if (filter.book !== null && filter.chapter !== null) {
      const first = (place: GeographyPlace) => geographyReferences(place, filter.translation).find((ref) => geographyReferenceMatches(ref, filter))?.v ?? Number.MAX_SAFE_INTEGER;
      const difference = first(a) - first(b);
      if (difference) return difference;
    }
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}
export function geographyReferenceLabel(reference: GeographyReference): string {
  return `${BOOKS[reference.b - 1]?.name ?? "Book"} ${reference.c}:${reference.v}`;
}
export function geographyReaderHref(reference: GeographyReference): string {
  return `/read/${BOOKS[reference.b - 1]?.abbr ?? "Gen"}/${reference.c}`;
}
function coordinateString(candidate: GeographyCandidate): string {
  if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lon) || Math.abs(candidate.lat) > 90 || Math.abs(candidate.lon) > 180) throw new Error("Invalid map coordinates");
  return `${candidate.lat},${candidate.lon}`;
}
// Isolate Earth's undocumented deep-link shape. Maps URLs and KML remain fallbacks.
export function googleEarthHref(candidate: GeographyCandidate): string {
  return `https://earth.google.com/web/search/${encodeURIComponent(coordinateString(candidate))}`;
}
export function googleMapsHref(candidate: GeographyCandidate): string {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: coordinateString(candidate) })}`;
}
export function googleStreetViewHref(candidate: GeographyCandidate): string {
  return `https://www.google.com/maps/@?${new URLSearchParams({ api: "1", map_action: "pano", viewpoint: coordinateString(candidate) })}`;
}
export function geographyPrecisionLabel(candidate: GeographyCandidate): string {
  switch (candidate.coordinateKind) {
    case "point": return "Mapped site point; not an exact event location";
    case "center": return "Approximate area center; not an exact site";
    case "settlement": return "Known settlement; precise site within it is unknown";
    case "representative point": return "Reference point for a region or geographic feature";
    default: return "Approximate reference point";
  }
}
export function geographyStatus(place: GeographyPlace): string {
  if (!place.candidates.length) return "Location unresolved";
  const top = place.candidates[0].score ?? 0;
  if (place.unresolved.some((item) => (item.score ?? 0) >= top && ["unknown_place", "nonspecific_place", "not_a_place", "not_a_proper_name"].includes(item.kind))) return "Location unresolved; candidates listed";
  if (top <= 0) return "Low source support; candidate only";
  return top === 1000 ? "High source confidence" : "Proposed identification";
}
