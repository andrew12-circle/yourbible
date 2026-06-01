/** Tools that produce ink strokes on the canvas. */
export type InkDrawTool =
  | "pencil"
  | "fineline"
  | "fountain"
  | "marker"
  | "highlighter"
  | "eraser";

/** Full toolbar selection, including non-drawing modes. */
export type InkTool = InkDrawTool | "ruler" | "lasso";

/** @deprecated Use InkDrawTool — kept for older saved strokes. */
export type LegacyInkTool = "pen" | "eraser";

export type InkPoint = {
  x: number;
  y: number;
  /** 0..1 normalized pressure; 0.5 when unknown. */
  p: number;
};

export type InkStroke = {
  tool: InkDrawTool;
  color: string;
  size: number;
  points: InkPoint[];
};

/** Strokes stored in DB/localStorage — coordinates normalized 0..1. */
export type StoredInkStroke = Omit<InkStroke, "points"> & {
  points: InkPoint[];
};

export type ReaderPageInkKey = {
  book: string;
  chapter: number;
  pageIndex: number;
  side: "left" | "right";
};

export type ReaderLayoutFingerprintInput = {
  bibleId: string;
  fontScale: number;
  pageWidth: number;
  pageHeight: number;
  singlePage: boolean;
};
