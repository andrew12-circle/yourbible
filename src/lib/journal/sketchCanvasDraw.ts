import type { SketchPaper } from "@/components/journal/sketch/SketchInkToolbar";
import { drawStroke as drawInkStroke } from "@/lib/ink/strokeRender";
import { mappedSketchColorForMode } from "@/lib/journal/sketchInkColors";
import type { InkStroke } from "@/lib/ink/types";

/** Spacing in CSS pixels between rules / grid lines / dots. */
export const PAPER_SPACING = 28;
/** Notebook left margin in CSS pixels. */
export const NOTEBOOK_MARGIN_X = 56;

export const DAY_CANVAS_BG = "#ffffff";
export const NIGHT_CANVAS_BG = "#05070a";
export const LEGAL_PAD_DAY_BG = "#fff9c4";
export const LEGAL_PAD_NIGHT_BG = "#1a1708";

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke, isNightMode = false) {
  drawInkStroke(ctx, stroke, {
    colorForStroke: (hex) => mappedSketchColorForMode(hex, isNightMode),
  });
}

export function canvasBackground(paper: SketchPaper, isNightMode: boolean): string {
  if (paper === "legal") return isNightMode ? LEGAL_PAD_NIGHT_BG : LEGAL_PAD_DAY_BG;
  return isNightMode ? NIGHT_CANVAS_BG : DAY_CANVAS_BG;
}

function drawRuledNotebook(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isNightMode: boolean,
  variant: "ruled" | "legal",
) {
  ctx.strokeStyle =
    variant === "legal"
      ? isNightMode
        ? "rgba(251, 191, 36, 0.28)"
        : "rgba(59, 130, 246, 0.42)"
      : isNightMode
        ? "rgba(96, 165, 250, 0.34)"
        : "rgba(99, 162, 214, 0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = PAPER_SPACING * 1.25; y < h; y += PAPER_SPACING) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  if (w > NOTEBOOK_MARGIN_X + 40) {
    ctx.strokeStyle =
      variant === "legal"
        ? isNightMode
          ? "rgba(248, 113, 113, 0.5)"
          : "rgba(220, 38, 38, 0.5)"
        : isNightMode
          ? "rgba(248, 113, 113, 0.44)"
          : "rgba(220, 38, 38, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(NOTEBOOK_MARGIN_X, 0);
    ctx.lineTo(NOTEBOOK_MARGIN_X, h);
    ctx.stroke();
  }
}

export function drawPaper(
  ctx: CanvasRenderingContext2D,
  paper: SketchPaper,
  w: number,
  h: number,
  isNightMode = false,
) {
  if (paper === "blank") return;
  ctx.save();
  if (paper === "ruled") {
    drawRuledNotebook(ctx, w, h, isNightMode, "ruled");
  } else if (paper === "legal") {
    drawRuledNotebook(ctx, w, h, isNightMode, "legal");
  } else if (paper === "graph") {
    ctx.strokeStyle = isNightMode ? "rgba(96, 165, 250, 0.24)" : "rgba(99, 162, 214, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = PAPER_SPACING; x < w; x += PAPER_SPACING) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = PAPER_SPACING; y < h; y += PAPER_SPACING) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  } else if (paper === "dot") {
    ctx.fillStyle = isNightMode ? "rgba(203, 213, 225, 0.44)" : "rgba(120, 120, 130, 0.45)";
    const r = 1;
    for (let y = PAPER_SPACING; y < h; y += PAPER_SPACING) {
      for (let x = PAPER_SPACING; x < w; x += PAPER_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
