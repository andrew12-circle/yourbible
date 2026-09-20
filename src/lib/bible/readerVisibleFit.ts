/** Text-line geometry, not paragraph bounding boxes: a paragraph can span columns. */
export interface ReaderVisibleFit { fits: boolean; overflowPx: number }
const TOLERANCE_PX = 1;
const clips = (overflow: string) => /^(hidden|clip|auto|scroll)$/.test(overflow);

export function readerVisibleFit(root: HTMLElement, heightLimit?: number): ReaderVisibleFit {
  const box = root.getBoundingClientRect();
  // jsdom / a detached measurement node has no geometry. Dimension checks in
  // the paginator still apply, but there are no visible fragments to inspect.
  if (box.width <= 0 || box.height <= 0) return { fits: true, overflowPx: 0 };
  const rootBottom = Math.min(box.bottom, heightLimit == null ? box.bottom : box.top + heightLimit);
  const bounds = new Map<HTMLElement, { left: number; right: number; top: number; bottom: number }>();
  bounds.set(root, { left: box.left, right: box.right, top: box.top, bottom: rootBottom });
  const boundFor = (element: HTMLElement): { left: number; right: number; top: number; bottom: number } => {
    const known = bounds.get(element);
    if (known) return known;
    const parent = element.parentElement;
    const inherited = parent && root.contains(parent) ? boundFor(parent) : bounds.get(root)!;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const b = { ...inherited };
    if (clips(style.overflowX)) { b.left = Math.max(b.left, rect.left); b.right = Math.min(b.right, rect.right); }
    if (clips(style.overflowY)) { b.top = Math.max(b.top, rect.top); b.bottom = Math.min(b.bottom, rect.bottom); }
    bounds.set(element, b);
    return b;
  };
  const range = document.createRange();
  if (typeof range.getClientRects !== "function") {
    let overflow = 0;
    for (const block of root.querySelectorAll<HTMLElement>("p, figure")) {
      const rect = block.getBoundingClientRect();
      overflow = Math.max(overflow, rect.bottom - rootBottom, rect.right - box.right);
    }
    return { fits: overflow <= TOLERANCE_PX, overflowPx: Math.max(0, overflow) };
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let overflow = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || !node.parentElement) continue;
    const element = node.parentElement;
    if (element.closest('[hidden]')) continue;
    const style = getComputedStyle(element);
    if (style.display === "none") continue;
    const b = boundFor(element);
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      overflow = Math.max(overflow, b.left - rect.left, rect.right - b.right, b.top - rect.top, rect.bottom - b.bottom);
    }
  }
  range.detach();
  return { fits: overflow <= TOLERANCE_PX, overflowPx: Math.max(0, overflow) };
}
