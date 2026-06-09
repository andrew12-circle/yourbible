/** Ignore sub-pixel ResizeObserver churn on iOS Safari (prevents scroll-pane padding flicker). */
export const ARTIFACT_MOBILE_LAYOUT_VAR_MIN_DELTA_PX = 2;

export function readArtifactLayoutPxVar(root: HTMLElement, name: string): number {
  const inline = root.style.getPropertyValue(name);
  const raw = inline || getComputedStyle(root).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

/** Set a layout CSS var only when the rounded value moves enough to matter. */
export function setArtifactLayoutPxVar(
  root: HTMLElement,
  name: string,
  nextPx: number,
  minDeltaPx = ARTIFACT_MOBILE_LAYOUT_VAR_MIN_DELTA_PX,
): boolean {
  const next = Math.max(0, Math.round(nextPx));
  const inline = root.style.getPropertyValue(name);
  const prev = inline ? parseFloat(inline) : NaN;
  if (!inline || !Number.isFinite(prev)) {
    root.style.setProperty(name, `${next}px`);
    return true;
  }
  if (Math.abs(next - prev) < minDeltaPx) return false;
  root.style.setProperty(name, `${next}px`);
  return true;
}

/**
 * Height of the fixed pinned video shell.
 * Uses width × 16:9 instead of getBoundingClientRect().height so iOS sub-pixel
 * layout passes do not oscillate `--artifact-mobile-pinned-header-h`.
 */
export function measureArtifactMobileVideoBlockHeight(container: HTMLElement): number {
  const aspectSlot = container.querySelector(".aspect-video") as HTMLElement | null;
  if (aspectSlot) {
    const width = aspectSlot.offsetWidth;
    if (width > 0) {
      const style = getComputedStyle(container);
      const padTop = parseFloat(style.paddingTop) || 0;
      const padBottom = parseFloat(style.paddingBottom) || 0;
      return Math.round(padTop + (width * 9) / 16 + padBottom);
    }
  }
  return Math.round(container.getBoundingClientRect().height);
}

export function syncArtifactMobilePinnedHeaderHeight(
  root: HTMLElement,
  videoHeightPx: number,
  stickyChromeHeightPx: number,
): void {
  setArtifactLayoutPxVar(root, "--artifact-mobile-pinned-header-h", videoHeightPx + stickyChromeHeightPx);
}

/** Coalesce ResizeObserver / viewport callbacks to one sync per frame. */
export function createCoalescedLayoutSync(sync: () => void): () => void {
  let raf = 0;
  return () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };
}
