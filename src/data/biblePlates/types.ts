export type BiblePlateKind = "artwork" | "artifact" | "map" | "architecture" | "place-photo" | "manuscript" | "timeline";
export type BiblePlateSource = "wikimedia" | "brooklyn" | "met" | "rijksmuseum" | "nga" | "loc" | "panorama";
export type BiblePlateLicense = "pd" | "cc0" | "cc-by";

export interface BiblePlate {
  id: string;
  bookAbbr: string;
  chapter: number;
  /** Insert before this verse in the reading stream (1 = chapter opener). */
  beforeVerse: number;
  title: string;
  referenceLabel: string;
  imageUrl: string;
  alt: string;
  artist?: string;
  kind?: BiblePlateKind;
  source?: BiblePlateSource;
  sourceUrl?: string;
  license?: BiblePlateLicense;
  /** Lower = shown first when multiple plates share a verse slot. */
  priority?: number;
  /** Validated, first-party derivative for visuals outside the legacy plate bundle. */
  assetPath?: string;
  visualAssetId?: string;
  context?: {
    label: string;
    note: string;
    credit: string;
    licenseLabel: string;
    licenseUrl?: string;
  };
}

export interface ChapterTimelineEvent { id: string; label: string; approxYear: string; empire?: string; }
export interface ChapterContextBundle {
  bookAbbr: string;
  chapter: number;
  plates: BiblePlate[];
  mapIds: string[];
  timeline: ChapterTimelineEvent[];
  relatedPassages: string[];
}
