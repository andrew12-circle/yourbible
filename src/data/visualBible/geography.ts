/** Modern reference coordinates, not reconstructed ancient buildings or a surveyed route. */
export interface GeoSite {
  id: string;
  label: string;
  lat: number;
  lng: number;
  precision: string;
  note: string;
  sourceUrl: string;
}
export interface GeoPassage { book: string; chapter: number; verse: number; endVerse: number }
export interface PassageGeography {
  id: string;
  title: string;
  passages: GeoPassage[];
  sites: GeoSite[];
  center: { lat: number; lng: number };
  zoom: number;
  cameraAltitude: number;
  caution: string;
}
export const GEOGRAPHY_CREDIT = "Reference coordinates: OpenBible.info (adapted selection); underlying contributors include OpenStreetMap.";
export const GEOGRAPHY_LICENSE = "https://creativecommons.org/licenses/by/4.0/";
export const PASSAGE_GEOGRAPHY: readonly PassageGeography[] = [{
  id: "triumphal-entry", title: "The triumphal entry · Jerusalem and the Mount of Olives",
  passages: [
    { book: "Mat", chapter: 21, verse: 1, endVerse: 11 },
    { book: "Mrk", chapter: 11, verse: 1, endVerse: 11 },
    { book: "Luk", chapter: 19, verse: 28, endVerse: 44 },
    { book: "Jhn", chapter: 12, verse: 12, endVerse: 19 },
  ],
  center: { lat: 31.777946, lng: 35.245686 }, zoom: 15, cameraAltitude: 800,
  caution: "Google imagery shows modern terrain and buildings. These reference points orient the reader; they do not establish Jesus’ exact route, an entry gate, or a first-century street plan. Camera altitude is only a viewing setting. Historical atlas images are interpretations, not satellite photographs of biblical times.",
  sites: [
    { id: "olives", label: "Mount of Olives", lat: 31.777946, lng: 35.245686,
      precision: "Representative point on the hill", note: "A reference point for the approach described in the Synoptic accounts, not an exact spot where the procession stood.",
      sourceUrl: "https://www.openbible.info/geo/modern/me461ba/mount-of-olives" },
    { id: "jerusalem", label: "Jerusalem", lat: 31.776667, lng: 35.234167,
      precision: "Representative point in the modern city", note: "General city location. This marker does not identify a particular ancient gate or building.",
      sourceUrl: "https://www.openbible.info/geo/modern/m66c5b8/jerusalem" },
    { id: "kidron", label: "Kidron valley / river", lat: 31.780278, lng: 35.24,
      precision: "Representative point along the river", note: "Nearby geographic context, not a claim that this was the procession’s crossing point.",
      sourceUrl: "https://www.openbible.info/geo/modern/ma5f44f/kidron-river" },
  ],
}];
export function geographyForPlate(book: string, chapter: number, verse: number, kind?: string): PassageGeography | undefined {
  return PASSAGE_GEOGRAPHY.find(scene => scene.passages.some(p => p.book === book && p.chapter === chapter &&
    ((verse >= p.verse && verse <= p.endVerse) || (kind === "map" && verse === 1))));
}
export function earthSceneUrl(scene: PassageGeography): string {
  return `https://earth.google.com/web/search/${encodeURIComponent(`${scene.center.lat},${scene.center.lng}`)}`;
}
