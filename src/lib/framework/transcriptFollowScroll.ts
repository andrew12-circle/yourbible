export type TranscriptFollowViewportInsets = { top: number; bottom: number };

export type MobileTranscriptFollowScrollMode = "inner" | "outer";

export const TRANSCRIPT_FOLLOW_CENTER_THRESHOLD_PX = 48;

/** Bias active row toward upper band on mobile (video pinned at top). 0 = top, 1 = bottom. */
export const TRANSCRIPT_FOLLOW_MOBILE_VISIBLE_BIAS = 0.38;

const ARTIFACT_DOCK_VAR = "--artifact-mobile-dock-h";
const ARTIFACT_STICKY_CHROME_VAR = "--artifact-mobile-sticky-chrome-h";
const DOCK_FALLBACK_PX = 88;

function readInheritedPxVar(from: HTMLElement, varName: string): number {
  let node: HTMLElement | null = from;
  while (node) {
    const value = parseFloat(getComputedStyle(node).getPropertyValue(varName));
    if (Number.isFinite(value) && value > 0) return value;
    node = node.parentElement;
  }
  return 0;
}

/** How much of the scroll container extends under the fixed mobile dock. */
export function readMobileDockBottomInset(container: HTMLElement): number {
  const dockH = readInheritedPxVar(container, ARTIFACT_DOCK_VAR) || DOCK_FALLBACK_PX;
  const containerBottom = container.getBoundingClientRect().bottom;
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const overlap = containerBottom - (viewportH - dockH);
  return Math.max(0, overlap);
}

/** Sticky toolbar under the pinned video (mobile YouTube detail). */
export function readMobileTranscriptFollowInsets(
  container: HTMLElement,
  mode: MobileTranscriptFollowScrollMode = "outer",
): TranscriptFollowViewportInsets {
  const bottom = readMobileDockBottomInset(container);
  if (mode === "inner") {
    return { top: 0, bottom };
  }

  const youtubeRoot = container.closest("[data-artifact-youtube-mobile]") as HTMLElement | null;
  const sticky = youtubeRoot
    ? readInheritedPxVar(youtubeRoot, ARTIFACT_STICKY_CHROME_VAR)
    : readInheritedPxVar(container, ARTIFACT_STICKY_CHROME_VAR);
  return { top: sticky, bottom };
}

function followTargetCenterY(
  visibleTop: number,
  visibleBottom: number,
  bias = 0.5,
): number {
  return visibleTop + (visibleBottom - visibleTop) * bias;
}

export function isTranscriptRowInFollowViewport(
  container: HTMLElement,
  el: HTMLElement,
  insets: TranscriptFollowViewportInsets = { top: 0, bottom: 0 },
  thresholdPx = TRANSCRIPT_FOLLOW_CENTER_THRESHOLD_PX,
  bias = 0.5,
): boolean {
  const containerRect = container.getBoundingClientRect();
  const visibleTop = containerRect.top + insets.top;
  const visibleBottom = containerRect.bottom - insets.bottom;
  const elRect = el.getBoundingClientRect();
  const elCenter = elRect.top + elRect.height / 2;
  const targetCenter = followTargetCenterY(visibleTop, visibleBottom, bias);
  return Math.abs(elCenter - targetCenter) <= thresholdPx;
}

export function scrollTranscriptRowIntoFollowViewport(
  container: HTMLElement,
  el: HTMLElement,
  insets: TranscriptFollowViewportInsets = { top: 0, bottom: 0 },
  behavior: ScrollBehavior = "smooth",
  bias = 0.5,
): void {
  const containerRect = container.getBoundingClientRect();
  const visibleTop = containerRect.top + insets.top;
  const visibleBottom = containerRect.bottom - insets.bottom;
  const elRect = el.getBoundingClientRect();
  const elCenter = elRect.top + elRect.height / 2;
  const targetCenter = followTargetCenterY(visibleTop, visibleBottom, bias);
  const delta = elCenter - targetCenter;
  const nextTop = container.scrollTop + delta;
  if (typeof container.scrollTo === "function") {
    container.scrollTo({ top: nextTop, behavior });
  } else {
    container.scrollTop = nextTop;
  }
}
