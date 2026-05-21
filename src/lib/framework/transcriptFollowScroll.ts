export type TranscriptFollowViewportInsets = { top: number; bottom: number };

export const TRANSCRIPT_FOLLOW_CENTER_THRESHOLD_PX = 48;

/** Sticky toolbar under the pinned video (mobile YouTube detail). */
export function readMobileTranscriptFollowInsets(container: HTMLElement): TranscriptFollowViewportInsets {
  const root = container.closest("[data-artifact-youtube-mobile]") as HTMLElement | null;
  if (!root) return { top: 0, bottom: 0 };
  const sticky = parseFloat(getComputedStyle(root).getPropertyValue("--artifact-mobile-sticky-chrome-h"));
  const top = Number.isFinite(sticky) && sticky > 0 ? sticky : 0;
  return { top, bottom: 0 };
}

export function isTranscriptRowInFollowViewport(
  container: HTMLElement,
  el: HTMLElement,
  insets: TranscriptFollowViewportInsets = { top: 0, bottom: 0 },
  thresholdPx = TRANSCRIPT_FOLLOW_CENTER_THRESHOLD_PX,
): boolean {
  const containerRect = container.getBoundingClientRect();
  const visibleTop = containerRect.top + insets.top;
  const visibleBottom = containerRect.bottom - insets.bottom;
  const elRect = el.getBoundingClientRect();
  const elCenter = elRect.top + elRect.height / 2;
  const containerCenter = (visibleTop + visibleBottom) / 2;
  return Math.abs(elCenter - containerCenter) <= thresholdPx;
}

export function scrollTranscriptRowIntoFollowViewport(
  container: HTMLElement,
  el: HTMLElement,
  insets: TranscriptFollowViewportInsets = { top: 0, bottom: 0 },
  behavior: ScrollBehavior = "smooth",
): void {
  const containerRect = container.getBoundingClientRect();
  const visibleTop = containerRect.top + insets.top;
  const visibleBottom = containerRect.bottom - insets.bottom;
  const elRect = el.getBoundingClientRect();
  const elCenter = elRect.top + elRect.height / 2;
  const containerCenter = (visibleTop + visibleBottom) / 2;
  const delta = elCenter - containerCenter;
  const nextTop = container.scrollTop + delta;
  if (typeof container.scrollTo === "function") {
    container.scrollTo({ top: nextTop, behavior });
  } else {
    container.scrollTop = nextTop;
  }
}
