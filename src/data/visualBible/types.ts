/** Visual material is commentary/context, never part of the Scripture text. */
export const VISUAL_KINDS = ["artwork", "artifact", "map", "place-photo", "architecture", "manuscript", "timeline"] as const;
export type VisualKind = typeof VISUAL_KINDS[number];
export const KIND_LABELS: Record<VisualKind, string> = {
  artwork: "Paintings & prints", artifact: "Artifacts", map: "Maps", "place-photo": "Places",
  architecture: "Architecture", manuscript: "Manuscripts", timeline: "Timelines",
};
export type VisualRelationship = "depiction" | "cultural-context" | "geography" | "reconstruction" | "textual-history" | "narrative-overview";
export const RELATIONSHIP_LABELS: Record<VisualRelationship, string> = {
  depiction: "Artistic interpretation", "cultural-context": "Historical comparison",
  geography: "Geographic context", reconstruction: "Reconstruction",
  "textual-history": "Manuscript tradition", "narrative-overview": "Narrative overview",
};
export interface VisualPassage {
  book: string;
  chapter: number;
  endChapter?: number;
  /** Optional exact range, only within a single chapter. Chapter links need no fabricated verse. */
  verse?: number;
  endVerse?: number;
  relationship: VisualRelationship;
  note: string;
}
export interface VisualSource {
  name: string;
  objectId?: string;
  /** Stable side/page/view identifier when one source record contains multiple images. */
  viewId?: string;
  url: string;
  license: string;
  licenseUrl?: string;
  credit: string;
  checkedOn?: string;
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
  alt: string;
}
export interface VisualSeed extends Omit<VisualAsset, "thumbnailUrl" | "detailUrl"> {
  revision: number;
  imageUrl: string;
}
