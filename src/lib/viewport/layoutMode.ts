import {
  ARTIFACT_TABLET_MIN_PX,
  ARTIFACT_VIDEO_DESKTOP_MIN_PX,
} from "@/lib/framework/artifactSurfaces";

/** Width at which we treat the viewport as tablet-sized (iPad portrait minimum). */
export const TABLET_MIN_PX = ARTIFACT_TABLET_MIN_PX;

/** Legacy width gate — phones and narrow viewports always use single-page reader chrome. */
export const READER_SINGLE_PAGE_MAX = 900;

/** Landscape spread needs enough height to distinguish tablets from phones on their side. */
export const READER_SPREAD_MIN_HEIGHT_PX = 600;

/** Large monitors — spread even in portrait. */
export const READER_DESKTOP_MIN_PX = 1200;

export type ViewportSize = { width: number; height: number; landscape: boolean };

export function readViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800, landscape: true };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const landscape =
    window.matchMedia("(orientation: landscape)").matches || width > height;
  return { width, height, landscape };
}

/**
 * Two-page spread: iPad landscape + desktop. Single page: phones and tablet portrait.
 * Uses height so phone landscape (wide but short) stays on the mobile layout.
 */
export function isReaderSpreadLayout(size: ViewportSize = readViewportSize()): boolean {
  const { width, height, landscape } = size;
  if (landscape && width >= READER_SINGLE_PAGE_MAX && height >= READER_SPREAD_MIN_HEIGHT_PX) {
    return true;
  }
  if (width >= READER_DESKTOP_MIN_PX && height >= 800) return true;
  return false;
}

export function isReaderSinglePageLayout(size: ViewportSize = readViewportSize()): boolean {
  return !isReaderSpreadLayout(size);
}

/** iPad upright — mobile chrome, but wider than a phone. */
export function isTabletPortraitLayout(size: ViewportSize = readViewportSize()): boolean {
  const { width, landscape } = size;
  return !landscape && width >= TABLET_MIN_PX && width < READER_DESKTOP_MIN_PX;
}

/** iPad / tablet — sketch paper fills viewport width (portrait or landscape). */
export function isTabletLayout(size: ViewportSize = readViewportSize()): boolean {
  return size.width >= TABLET_MIN_PX;
}

/** Phone or tablet portrait — compact ink / sketch toolbars. */
export function isCompactInkLayout(size: ViewportSize = readViewportSize()): boolean {
  return isReaderSinglePageLayout(size);
}

/**
 * iPad / tablet artifact band: handwritten journal by default; phones and desktop use typing.
 * Matches artifact layout below desktop (768px–1023px).
 */
export function isHandwrittenPreferredLayout(size: ViewportSize = readViewportSize()): boolean {
  const { width } = size;
  return width >= ARTIFACT_TABLET_MIN_PX && width < ARTIFACT_VIDEO_DESKTOP_MIN_PX;
}
