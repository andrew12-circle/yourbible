import { cn } from "@/lib/utils";

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

/** Mobile: header + sticky 16:9 video + tab bar. */
export const artifactScrollMtMobile = "scroll-mt-[calc(3.5rem+56.25vw+2.75rem)] lg:scroll-mt-32";

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
