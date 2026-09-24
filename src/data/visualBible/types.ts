/** Visual material is commentary/context, never part of the Scripture text. */
export const VISUAL_KINDS = ["artwork", "artifact", "map", "place-photo", "architecture", "manuscript", "timeline"] as const;
export type VisualKind = typeof VISUAL_KINDS[number];
export const KIND_LABELS: Record<VisualKind, string> = {
  artwork: "Paintings & sacred art", artifact: "Artifacts", map: "Maps", "place-photo": "Places",
  architecture: "Architecture", manuscript: "Manuscripts", timeline: "Timelines",
};
export type VisualRelationship = "depiction" | "cultural-context" | "geography" | "reconstruction" | "textual-history" | "narrative-overview" | "thematic";
export const RELATIONSHIP_LABELS: Record<VisualRelationship, string> = {
  depiction: "Artistic interpretation", "cultural-context": "Historical comparison",
  geography: "Geographic context", reconstruction: "Reconstruction",
  "textual-history": "Manuscript tradition", "narrative-overview": "Narrative overview",
  thematic: "Thematic / devotional connection",
};
export type VisualCollection = "masterworks" | "maps" | "artifacts" | "heritage" | "places";
export type VisualTechnique = "painting" | "engraving" | "fresco" | "mosaic" | "icon" | "sculpture" | "manuscript" | "photograph" | "map" | "diagram";
export interface VisualPassage {
  book: string;
  chapter: number;
  endChapter?: number;
  /** Optional exact range, only within a single chapter. */
  verse?: number;
  endVerse?: number;
  relationship: VisualRelationship;
  note: string;
  /** False for a library connection that has not been selected for inline placement. */
  inline?: boolean;
}
export interface VisualSource {
  name: string;
  objectId?: string;
  viewId?: string;
  url: string;
  license: string;
  licenseUrl?: string;
  credit: string;
  checkedOn?: string;
  /** Credit for the particular photograph, distinct from the historical artist. */
  photographer?: string;
  /** Original source record revision and file identity retained at acquisition. */
  recordRevision?: number;
  imageSha1?: string;
  originalImageUrl?: string;
  rightsNote?: string;
  objectUrl?: string;
}
export interface VisualAsset {
  id: string;
  kind: VisualKind;
  title: string;
  creator: string;
  date: string;
  culture: string;
  medium: string;
  description: string;
  caution: string;
  tags: string[];
  passages: VisualPassage[];
  source: VisualSource;
  review: "source-checked" | "legacy" | "original";
  thumbnailUrl: string;
  detailUrl: string;
  readerUrl?: string;
  alt: string;
  collections?: VisualCollection[];
  technique?: VisualTechnique;
  period?: string;
  holdingCollection?: string;
  /** Same physical artwork can have a full view and clearly identified panels. */
  workGroup?: string;
  iconic?: boolean;
  /** Entire asset is for browsing rather than automatic inline placement. */
  galleryOnly?: boolean;
  /** Lower values have higher editorial priority; never selected randomly. */
  readerRank?: number;
  sourceDimensions?: { width: number; height: number };
}
export interface VisualSeed extends Omit<VisualAsset, "thumbnailUrl" | "detailUrl" | "readerUrl"> {
  revision: number;
  imageUrl: string;
  /** New acquisitions provide a separate lightweight reader derivative. */
  readerDerivative?: boolean;
}
