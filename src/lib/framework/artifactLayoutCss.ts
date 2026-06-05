import { cn } from "@/lib/utils";

/** Sticky 16:9 video height (full-width slot). Set on layout root. */
export const ARTIFACT_STICKY_VIDEO_H = "56.25vw";

/** Section nav sits below framework header + sticky video when study uses window scroll. */
export const artifactSectionNavStickyBelowVideo = cn(
  "sticky z-[28]",
  "top-[calc(var(--artifact-header-h,0px)+env(safe-area-inset-top,0px)+var(--artifact-sticky-video-h,56.25vw))]",
);

/** Hash jump offset: header + safe area + sticky video + optional in-flow chrome before sections. */
export const artifactScrollMtStickyVideo = cn(
  "scroll-mt-[calc(var(--artifact-header-h,0px)+env(safe-area-inset-top,0px)+var(--artifact-sticky-video-h,56.25vw)+var(--artifact-sticky-chrome-h,0px)+0.75rem)]",
  "lg:scroll-mt-32",
);

/** Sections inside the scroll pane below a pinned mobile video (video is outside this scroller). */
export const artifactScrollMtMobilePane = "scroll-mt-4";

/** Scroll pane starts below the fixed video only; meta + toolbar live inside the scroller. */
export const artifactMobileVideoOnlyPadding = "pt-[var(--artifact-mobile-video-h,56.25vw)]";

/** Bottom clearance for fixed mobile app dock on artifact detail. */
export const artifactMobileDockPadding = "pb-[var(--artifact-mobile-dock-h,5.5rem)]";

/** Default dock height (pill bar + safe area) — set on layout root when dock mounts. */
export const ARTIFACT_MOBILE_DOCK_H = "6rem";

/** Desktop / mobile study column that hosts the floating app dock. */
export const ARTIFACT_STUDY_PANE_SELECTOR = "[data-artifact-study-pane]";

/** Collapsed header = video + sticky toolbar (meta scrolled away). */
export const artifactMobilePinnedHeaderPadding = "pt-[var(--artifact-mobile-pinned-header-h,56.25vw)]";

/**
 * Handwritten journal under the pinned video — same horizontal edge alignment as
 * `ArtifactYoutubeVideoBlock` (`fixed inset-x-0`, full viewport width).
 */
/** Slight grey surround so the white journal sheet reads clearly on mobile. */
export const artifactJournalMobileChromeBg = "bg-muted/50 dark:bg-muted/35";

/** White typing / title surface on top of mobile journal chrome. */
export const artifactJournalMobileSheet = "bg-background dark:bg-card";

/** Mobile typed journal tab — fixed under pinned video (no 100vw bleed; avoids iPad clip). */
export const artifactMobileTypedJournalUnderVideo = cn(
  "fixed inset-x-0 z-[38] flex min-h-0 w-full max-w-[100vw] flex-col overflow-hidden",
  "top-[var(--artifact-mobile-video-h,56.25vw)]",
  "bottom-[calc(var(--artifact-mobile-dock-h,5.5rem)+env(safe-area-inset-bottom,0px))]",
  artifactJournalMobileChromeBg,
);

/** Full-width white page: title, marks, and typing (scrolls inside fixed shell). */
export const artifactMobileTypedJournalPage = cn(
  artifactJournalMobileSheet,
  "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-y-auto overscroll-contain",
  "pb-3",
);

export const artifactMobileHandwriteUnderVideo = cn(
  "fixed inset-x-0 z-[38] flex min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-background",
  "top-[var(--artifact-mobile-video-h,56.25vw)]",
  "bottom-[calc(var(--artifact-mobile-dock-h,5.5rem)+env(safe-area-inset-bottom,0px))]",
);

/** Horizontal inset for journal controls/text under pinned video. */
export const artifactMobileJournalEdgePad = cn(
  "px-[max(1rem,env(safe-area-inset-left,0px))]",
  "pr-[max(1rem,env(safe-area-inset-right,0px))]",
);
