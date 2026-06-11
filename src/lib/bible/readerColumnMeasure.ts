/**
 * Pagination measurement helpers for CSS multi-column scripture layout.
 * Live pages constrain `.scripture-columns-2` to the article height (`h-full`);
 * the hidden paginator must use the same fixed height or splits will not match.
 */

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
    `<div class="${columnsClassName}" style="height:${h}px;overflow:hidden;width:100%;min-height:0;box-sizing:border-box">` +
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
