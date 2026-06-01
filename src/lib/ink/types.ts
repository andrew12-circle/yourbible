export type InkTool = "pen" | "eraser";

export type InkPoint = {
  x: number;
  y: number;
  /** 0..1 normalized pressure; 0.5 when unknown. */
  p: number;
};

export type InkStroke = {
  tool: InkTool;
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
