import { cn } from "@/lib/utils";

/** Sticky 16:9 video height (full-width slot). Set on layout root. */
export const ARTIFACT_STICKY_VIDEO_H = "56.25vw";

/** Section nav sits below framework header + sticky video when study uses window scroll. */
export const artifactSectionNavStickyBelowVideo = cn(
  "sticky z-[28]",
  "top-[calc(var(--artifact-header-h,0px)+var(--artifact-sticky-video-h,56.25vw))]",
);

/** Hash jump offset: header + sticky video + optional in-flow chrome before sections. */
export const artifactScrollMtStickyVideo = cn(
  "scroll-mt-[calc(var(--artifact-header-h,0px)+var(--artifact-sticky-video-h,56.25vw)+var(--artifact-sticky-chrome-h,0px)+0.75rem)]",
  "lg:scroll-mt-32",
);
