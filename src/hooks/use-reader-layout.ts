import * as React from "react";
import {
  isCompactInkLayout,
  isReaderSinglePageLayout,
  isTabletLayout,
  isTabletPortraitLayout,
  readViewportSize,
  READER_SINGLE_PAGE_MAX,
} from "@/lib/viewport/layoutMode";

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
    sync();

    return () => {
      narrow.removeEventListener("change", sync);
      wide.removeEventListener("change", sync);
      portrait.removeEventListener("change", sync);
      landscape.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [selector]);

  return value;
}

/** Phones and tablet portrait: one page at a time. Spread on iPad landscape + desktop. */
export function useReaderSinglePage() {
  return useViewportLayout(isReaderSinglePageLayout);
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
