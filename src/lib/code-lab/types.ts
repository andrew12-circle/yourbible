export type TextProfileId = "hebrew-consonants" | "latin-letters" | "ethiopic" | "auto";

export type ElsDirection = "forward" | "backward";

export type CodeLabScopeKind =
  | "passage"
  | "chapter"
  | "book"
  | "torah"
  | "ot"
  | "nt"
  | "full";

export interface VerseSegment {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  raw: string;
}

export interface LetterIndex {
  streamIndex: number;
  book: string;
  chapter: number;
  verse: number;
  charOffsetInVerse: number;
}

export interface TextStream {
  bibleId: string;
  profileId: TextProfileId;
  segments: VerseSegment[];
  letters: string;
  indexMap: LetterIndex[];
}

export interface CodeLabScope {
  kind: CodeLabScopeKind;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
}

export interface ElsHit {
  term: string;
  skip: number;
  direction: ElsDirection;
  startIndex: number;
  endIndex: number;
  indices: number[];
  anchor: LetterIndex;
  endAnchor: LetterIndex;
}

export interface ElsSearchOptions {
  minSkip: number;
  maxSkip: number;
  direction: ElsDirection | "both";
  maxHits?: number;
}

export interface MatrixCell {
  row: number;
  col: number;
  streamIndex: number;
  letter: string;
  highlighted: boolean;
  isSeed: boolean;
}

export interface MatrixView {
  columns: number;
  rows: number;
  cells: MatrixCell[];
  seedHit: ElsHit;
  windowStart: number;
  windowEnd: number;
}

export interface CodeCardData {
  bibleId: string;
  bibleLabel: string;
  profileId: TextProfileId;
  scope: CodeLabScope;
  term: string;
  hit: ElsHit;
  referenceLabel: string;
  createdAt: string;
}
