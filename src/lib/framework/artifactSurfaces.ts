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
