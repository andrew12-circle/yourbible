/** Breakpoint for compact (phone) vs hub-capable layouts. */
export const COMPACT_VIEWPORT_PX = 768;

/** Shortest viewport edge — stable across phone landscape rotation. */
export function readCompactViewportEdge(): number {
  if (typeof window === "undefined") return COMPACT_VIEWPORT_PX;
  return Math.min(window.innerWidth, window.innerHeight);
}

/** True on phones and narrow split-view panes (hub shell hidden). */
export function readIsCompactViewport(): boolean {
  return readCompactViewportEdge() < COMPACT_VIEWPORT_PX;
}

/** True when hub shell chrome should mount (tablet/desktop-class viewport). */
export function readIsHubShellViewport(): boolean {
  return !readIsCompactViewport();
}
