import * as React from "react";
import {
  isCompactInkLayout,
  isHandwrittenPreferredLayout,
  isReaderCompactChrome,
  isReaderSinglePageLayout,
  isReaderSpreadLayout,
  isTabletLayout,
  isTabletPortraitLayout,
  readViewportSize,
  READER_SINGLE_PAGE_MAX,
} from "@/lib/viewport/layoutMode";
import { queryMiniPhoneAppRoot } from "@/lib/mini-phone/miniPhoneLayoutViewport";

export { READER_SINGLE_PAGE_MAX };

function useViewportLayout<T>(selector: (size: ReturnType<typeof readViewportSize>) => T): T {
  const [value, setValue] = React.useState<T>(() => selector(readViewportSize()));

  React.useEffect(() => {
    const sync = () => setValue(selector(readViewportSize()));
    const narrow = window.matchMedia(`(max-width: ${READER_SINGLE_PAGE_MAX - 1}px)`);
    const wide = window.matchMedia("(min-width: 900px)");
    const portrait = window.matchMedia("(orientation: portrait)");
    const landscape = window.matchMedia("(orientation: landscape)");

    narrow.addEventListener("change", sync);
    wide.addEventListener("change", sync);
    portrait.addEventListener("change", sync);
    landscape.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    const phoneRoot = queryMiniPhoneAppRoot();
    const phoneRo = phoneRoot ? new ResizeObserver(sync) : null;
    phoneRo?.observe(phoneRoot!);

    sync();

    return () => {
      narrow.removeEventListener("change", sync);
      wide.removeEventListener("change", sync);
      portrait.removeEventListener("change", sync);
      landscape.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      phoneRo?.disconnect();
    };
  }, [selector]);

  return value;
}

/** Portrait-only single page. Landscape uses a two-page spread (including phones). */
export function useReaderSinglePage() {
  return useViewportLayout(isReaderSinglePageLayout);
}

/** Open book — left and right pages visible together. */
export function useReaderSpread() {
  return useViewportLayout(isReaderSpreadLayout);
}

/** Mobile menu + compact header (phones, tablet portrait). */
export function useReaderCompactChrome() {
  return useViewportLayout(isReaderCompactChrome);
}

/** iPad upright — mobile chrome with extra horizontal room. */
export function useIsTabletPortrait() {
  return useViewportLayout(isTabletPortraitLayout);
}

/** iPad / tablet width — full-bleed sketch paper, no letterboxed page. */
export function useIsTablet() {
  return useViewportLayout(isTabletLayout);
}

/** Compact ink toolbars (phone + tablet portrait). */
export function useCompactInkLayout() {
  return useViewportLayout(isCompactInkLayout);
}

/** iPad artifact journal: open handwritten by default (not iPhone or desktop). */
export function useHandwrittenPreferredJournal() {
  return useViewportLayout(isHandwrittenPreferredLayout);
}
