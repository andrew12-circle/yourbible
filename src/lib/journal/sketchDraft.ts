/** In-browser draft for handwritten journal strokes (survives page leave). */

export type SketchDraftStroke = {
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: { x: number; y: number; p: number }[];
};

export type SketchDraftPaper = "blank" | "ruled" | "graph" | "dot";

export type SketchDraftV1 = {
  version: 1;
  strokes: SketchDraftStroke[];
  paper: SketchDraftPaper;
  color: string;
  size: number;
  tool: "pen" | "eraser";
  updatedAt: string;
};

const DRAFT_PREFIX = "yourbible:sketch-draft:";

export function sketchDraftStorageKey(key: string) {
  return `${DRAFT_PREFIX}${key}`;
}

export function loadSketchDraft(key: string): SketchDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sketchDraftStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SketchDraftV1;
    if (parsed?.version !== 1 || !Array.isArray(parsed.strokes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSketchDraft(key: string, draft: Omit<SketchDraftV1, "version" | "updatedAt">) {
  if (typeof window === "undefined") return;
  const payload: SketchDraftV1 = {
    version: 1,
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(sketchDraftStorageKey(key), JSON.stringify(payload));
  } catch {
    /* quota — ignore */
  }
}

export function clearSketchDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(sketchDraftStorageKey(key));
  } catch {
    /* noop */
  }
}
