import { canvasBackground, drawPaper, drawStroke } from "@/lib/journal/sketchCanvasDraw";
import type { SketchPaper } from "@/components/journal/sketch/SketchInkToolbar";
import type { InkStroke } from "@/lib/ink/types";

const PAGE_GAP = 16;

/**
 * Rasterize notebook pages into one tall PNG (pages stacked with a small gap).
 */
export async function exportSketchPagesPng(opts: {
  pages: InkStroke[][];
  width: number;
  height: number;
  paper: SketchPaper;
  isNightMode: boolean;
  filename: string;
  dpr?: number;
}): Promise<File | null> {
  const { pages, width, height, paper, isNightMode, filename } = opts;
  const dpr = Math.min(opts.dpr ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1), 2.5);
  const nonEmpty = pages.length > 0 ? pages : [[]];
  const pageH = height;
  const totalH = nonEmpty.length * pageH + Math.max(0, nonEmpty.length - 1) * PAGE_GAP;

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.floor(width * dpr));
  out.height = Math.max(1, Math.floor(totalH * dpr));
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = isNightMode ? "#000000" : "#e8e8ed";
  ctx.fillRect(0, 0, width, totalH);

  for (let i = 0; i < nonEmpty.length; i++) {
    const y = i * (pageH + PAGE_GAP);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.max(1, Math.floor(width * dpr));
    pageCanvas.height = Math.max(1, Math.floor(pageH * dpr));
    const pctx = pageCanvas.getContext("2d");
    if (!pctx) continue;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.fillStyle = canvasBackground(paper, isNightMode);
    pctx.fillRect(0, 0, width, pageH);
    drawPaper(pctx, paper, width, pageH, isNightMode);
    for (const stroke of nonEmpty[i] ?? []) {
      drawStroke(pctx, stroke, isNightMode);
    }
    ctx.drawImage(pageCanvas, 0, y, width, pageH);
  }

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob((b) => resolve(b), "image/png"));
  if (!blob) return null;
  return new File([blob], filename.endsWith(".png") ? filename : `${filename}.png`, {
    type: "image/png",
  });
}
