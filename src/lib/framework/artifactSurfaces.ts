import { cn } from "@/lib/utils";

/** Viewport width at which framework header is shown on YouTube detail (`md`). */
export const ARTIFACT_TABLET_MIN_PX = 768;

/** Viewport width at which study layout uses split pane + side transcript. Matches `lg`. */
export const ARTIFACT_VIDEO_DESKTOP_MIN_PX = 1024;

/** Viewport width at which video uses PiP on scroll (tablet + desktop). Phones use sticky. Matches `md`. */
export const ARTIFACT_VIDEO_PIP_MIN_PX = ARTIFACT_TABLET_MIN_PX;

/** Shared surfaces for artifact detail study layout */
export const artifactCard = cn(
  "rounded-2xl bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
);

/** Video slot + PiP player chrome (matches artifactInset corners). */
export const artifactVideoRadius = "rounded-xl";

export const artifactInset = cn(artifactVideoRadius, "bg-muted/15");

export const sectionLabel = cn("text-[11px] font-medium text-muted-foreground");

/** Hash jump offset below framework header (desktop / non-sticky video). */
export const artifactScrollMt = "scroll-mt-32";

/** Phone/tablet sticky video: measured header + 16:9 video + optional chrome band. */
export {
  artifactMobileDockPadding,
  artifactMobilePinnedHeaderPadding,
  artifactMobileVideoOnlyPadding,
  artifactScrollMtMobilePane,
  artifactScrollMtStickyVideo as artifactScrollMtMobile,
} from "@/lib/framework/artifactLayoutCss";

/** Mobile study column: divider stack (no nested card chrome per section). */
export const artifactStudyStackMobile = "divide-y divide-border/50";

/** Mobile study section trigger — touch-friendly, flat. */
export const artifactStudySectionTriggerMobile = cn(
  "flex w-full min-h-11 items-center justify-between gap-3 py-3.5 text-left",
  "transition-colors hover:bg-muted/25 active:bg-muted/40",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

/** Mobile study section body below trigger. */
export const artifactStudySectionContentMobile = "pb-4 pt-1.5";

/** Mobile study column: airy section blocks (replaces flat divider stack). */
export const artifactStudyBodyMobile = cn(
  "space-y-10 bg-background pb-10",
);

/** Mobile premium section title (Playfair). */
export const artifactStudySectionTitle = cn(
  "font-display text-lg font-semibold tracking-tight text-foreground",
);

/** Elevated card surface for mobile study sections. */
export const artifactPremiumCard = cn(
  "rounded-2xl border border-border/40 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
  "dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
);

/** @deprecated Use artifactInsightPreviewCard + artifactPastelTint from artifactStudyTheme. */
export { artifactInsightPreviewCard as artifactInsightCard } from "@/lib/framework/artifactStudyTheme";

export {
  artifactContinueCardHover,
  artifactStudyChapterLink,
  artifactStudyCount,
  artifactStudyDotActive,
  artifactStudyIconWell,
  artifactStudyLink,
  artifactStudyTabActive as artifactDesktopTabActive,
} from "@/lib/framework/artifactStudyTheme";

/** Shared horizontal scroll track (snap variant applied per surface). */
export const artifactHorizontalRailBase = cn(
  "flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide",
  "-mx-1 px-1 pb-1 touch-pan-x overscroll-x-contain",
  "[-webkit-overflow-scrolling:touch]",
);

/** Horizontal snap scroll rail (breaks out of section padding). */
export const artifactHorizontalRail = cn(
  artifactHorizontalRailBase,
  "snap-x snap-mandatory",
);

/** Rail card (~72% viewport width on phone). */
export const artifactRailCard = cn(
  "snap-start shrink-0 basis-[72%] max-w-[280px]",
  artifactPremiumCard,
  "p-4 text-left transition active:scale-[0.99]",
);

/** Desktop claim review card in a horizontal rail — white card, scroll body, pinned toolbar. */
export const artifactDesktopClaimCard = cn(
  "flex w-[min(420px,88vw)] max-w-[480px] shrink-0 snap-start flex-col",
  "overflow-hidden rounded-2xl border border-border/60 bg-white",
  "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
  "max-h-[min(78vh,720px)]",
);

/** Mobile claim card in a horizontal rail — wide cards under pinned video. */
export const artifactMobileClaimCard = cn(
  "flex w-[min(92vw,420px)] max-w-[420px] shrink-0 flex-col",
  "overflow-hidden rounded-2xl border border-border/60 bg-white",
  "shadow-[0_4px_24px_rgba(0,0,0,0.1)]",
  "max-h-[min(65vh,640px)]",
);

/** Horizontal rail for desktop claim cards (wider gaps). */
export const artifactDesktopClaimsRail = cn(
  artifactHorizontalRail,
  "items-stretch gap-4 pb-3 -mx-0.5 px-0.5",
);

/** Horizontal rail for mobile claim cards (break out of study column padding). */
export const artifactMobileClaimsRail = cn(
  artifactHorizontalRailBase,
  "snap-x snap-proximity items-stretch gap-3 pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4",
);

/** Desktop cinematic hero — full-bleed thumbnail + dark gradient overlay. */
export const artifactDesktopHero = cn(
  "relative isolate overflow-hidden",
  "min-h-[280px] sm:min-h-[320px]",
);

/** Desktop study body — section nav + study content below the video card. */
export const artifactDesktopBodySheet = cn(
  "relative z-10 mt-0",
  "px-4 pb-10 sm:px-6",
);

/** Desktop transcript column — light floating study panel. */
export const artifactDesktopTranscriptPanel = cn(
  "rounded-2xl border border-border/55 bg-card",
  "shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03]",
);

/** Format seconds as compact duration (e.g. 1h 32m). */
export function formatArtifactDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

/** Format ISO date for artifact meta row. */
export function formatArtifactDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
