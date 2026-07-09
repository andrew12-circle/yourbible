import {
  ARTIFACT_TABLET_MIN_PX,
  ARTIFACT_VIDEO_DESKTOP_MIN_PX,
} from "@/lib/framework/artifactSurfaces";
import { readEffectiveLayoutViewport } from "@/lib/mini-phone/miniPhoneLayoutViewport";

/** Width at which we treat the viewport as tablet-sized (iPad portrait minimum). */
export const TABLET_MIN_PX = ARTIFACT_TABLET_MIN_PX;

/** Width below which portrait layouts use compact reader chrome (mobile menu). */
export const READER_SINGLE_PAGE_MAX = 900;

/** Large monitors — spread even in portrait. */
export const READER_DESKTOP_MIN_PX = 1200;

export type ViewportSize = { width: number; height: number; landscape: boolean };

export function readViewportSize(): ViewportSize {
  return readEffectiveLayoutViewport();
}

/**
 * Two-page spread: tablet+ landscape and large portrait monitors.
 * Phone landscape stays single-page (columns too narrow).
 */
export function isReaderSpreadLayout(size: ViewportSize = readViewportSize()): boolean {
  const { width, height, landscape } = size;
  if (landscape) return width >= READER_SINGLE_PAGE_MAX;
  if (width >= READER_DESKTOP_MIN_PX && height >= 800) return true;
  return false;
}

export function isReaderSinglePageLayout(size: ViewportSize = readViewportSize()): boolean {
  return !isReaderSpreadLayout(size);
}

/** Compact top bar / menus — phones in any orientation, tablet portrait. */
export function isReaderCompactChrome(size: ViewportSize = readViewportSize()): boolean {
  const { width, landscape } = size;
  if (landscape) return width < READER_SINGLE_PAGE_MAX;
  return width < READER_DESKTOP_MIN_PX;
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
  return isReaderCompactChrome(size);
}

/**
 * iPad / tablet artifact band: handwritten journal by default; phones and desktop use typing.
 * Matches artifact layout below desktop (768px–1023px).
 */
export function isHandwrittenPreferredLayout(size: ViewportSize = readViewportSize()): boolean {
  const { width } = size;
  return width >= ARTIFACT_TABLET_MIN_PX && width < ARTIFACT_VIDEO_DESKTOP_MIN_PX;
}
