import type { CSSProperties } from "react";

/**
 * Pagination measurement helpers for CSS multi-column scripture layout.
 * Live pages must use the same fixed pixel height as the hidden paginator or
 * browsers fall back to balanced columns (top-half / bottom-half banding).
 */

/** Inline styles for the live `.scripture-columns-2` wrapper (matches paginator). */
export function scriptureColumnWrapperStyle(contentHeightPx?: number): CSSProperties {
  const base: CSSProperties = {
    overflow: "hidden",
    boxSizing: "border-box",
    columnFill: "auto",
    WebkitColumnFill: "auto",
  };
  if (!contentHeightPx || contentHeightPx <= 0) return base;
  const h = Math.max(1, Math.round(contentHeightPx));
  return { ...base, height: h, maxHeight: h };
}

export function applyScriptureColumnMeasureHtml(
  node: HTMLDivElement,
  bodyHtml: string,
  columnsClassName: string | undefined,
  contentHeightPx: number,
): void {
  if (!columnsClassName) {
    node.innerHTML = bodyHtml;
    return;
  }
  const h = Math.max(1, Math.round(contentHeightPx));
  node.innerHTML =
    `<div class="${columnsClassName}" style="height:${h}px;overflow:hidden;width:100%;min-height:0;box-sizing:border-box;column-fill:auto;-webkit-column-fill:auto">` +
    `${bodyHtml}</div>`;
}

/** True when rendered content fits within the page text area (incl. two-column flow). */
export function scriptureContentFitsPage(
  node: HTMLDivElement,
  contentHeightPx: number,
  columnsClassName?: string,
): boolean {
  const limit = Math.max(1, Math.round(contentHeightPx));
  if (!columnsClassName) {
    return node.scrollHeight <= limit;
  }
  const col = node.firstElementChild as HTMLElement | null;
  if (!col) return true;
  return col.scrollHeight <= col.clientHeight + 1;
}
