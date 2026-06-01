/** In-browser draft for handwritten journal strokes (survives page leave). */

import { normalizeInkDrawTool } from "@/lib/ink/toolPresets";
import type { InkDrawTool, InkTool } from "@/lib/ink/types";

export type SketchDraftStroke = {
  tool: InkDrawTool | "pen";
  color: string;
  size: number;
  points: { x: number; y: number; p: number }[];
};

export type SketchDraftPaper = "blank" | "ruled" | "legal" | "graph" | "dot";

const VALID_SKETCH_PAPER = new Set<SketchDraftPaper>(["blank", "ruled", "legal", "graph", "dot"]);

export function normalizeSketchDraftPaper(value: unknown): SketchDraftPaper {
  return typeof value === "string" && VALID_SKETCH_PAPER.has(value as SketchDraftPaper)
    ? (value as SketchDraftPaper)
    : "ruled";
}

export type SketchDraftV2 = {
  version: 2;
  strokes: SketchDraftStroke[];
  paper: SketchDraftPaper;
  color: string;
  size: number;
  tool: InkTool;
  rulerVisible?: boolean;
  rulerAngle?: number;
  updatedAt: string;
};

type SketchDraftV1 = {
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

function normalizeStrokes(strokes: SketchDraftStroke[]): SketchDraftStroke[] {
  return strokes.map((s) => ({
    ...s,
    tool: normalizeInkDrawTool(s.tool),
  }));
}

export function loadSketchDraft(key: string): SketchDraftV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sketchDraftStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SketchDraftV2 | SketchDraftV1;
    if (!parsed || !Array.isArray(parsed.strokes)) return null;
    if (parsed.version === 2) {
      return {
        ...parsed,
        strokes: normalizeStrokes(parsed.strokes),
        paper: normalizeSketchDraftPaper(parsed.paper),
        tool: parsed.tool ?? "fountain",
      };
    }
    return {
      version: 2,
      strokes: normalizeStrokes(parsed.strokes),
      paper: normalizeSketchDraftPaper(parsed.paper),
      color: parsed.color,
      size: parsed.size,
      tool: parsed.tool === "eraser" ? "eraser" : "fountain",
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveSketchDraft(key: string, draft: Omit<SketchDraftV2, "version" | "updatedAt">) {
  if (typeof window === "undefined") return;
  const payload: SketchDraftV2 = {
    version: 2,
    ...draft,
    strokes: normalizeStrokes(draft.strokes),
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(sketchDraftStorageKey(key), JSON.stringify(payload));
  } catch {
    /* quota */
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
