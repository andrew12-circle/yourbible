import { cn } from "@/lib/utils";

/** Pastel tints for overview / insight preview cards (reference: purple → orange → blue → pink). */
export const artifactPastelTints = [
  {
    card: "bg-violet-50/90 border-violet-100",
    number: "text-violet-300",
    link: "text-violet-700 hover:text-violet-800",
    ref: "text-violet-900/80",
  },
  {
    card: "bg-orange-50/90 border-orange-100",
    number: "text-orange-300",
    link: "text-orange-800 hover:text-orange-900",
    ref: "text-orange-900/80",
  },
  {
    card: "bg-sky-50/90 border-sky-100",
    number: "text-sky-300",
    link: "text-sky-800 hover:text-sky-900",
    ref: "text-sky-900/80",
  },
  {
    card: "bg-pink-50/90 border-pink-100",
    number: "text-pink-300",
    link: "text-pink-800 hover:text-pink-900",
    ref: "text-pink-900/80",
  },
] as const;

export function artifactPastelTint(index: number) {
  return artifactPastelTints[index % artifactPastelTints.length];
}

export function formatInsightClaimNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Primary accent for artifact study chrome (tabs, CTAs, links) — matches app-theme system blue. */
export const artifactStudyPrimaryButton = cn(
  "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
);

export const artifactStudyLink = "font-medium text-primary hover:text-primary/80";
export const artifactStudyCount = "text-muted-foreground";
export const artifactStudyTabActive = "border-b-2 border-primary text-foreground";
export const artifactStudyChapterLink = "text-primary hover:text-primary/80";
export const artifactStudyDotActive = "bg-primary";

/** Claim index on dark insight cards — iOS Messages bubble green (#34C759). */
export const artifactInsightClaimNumberColor = "text-[#34C759]";

export const artifactStudyTranscriptActive =
  "rounded-lg bg-primary/10 ring-1 ring-primary/30";
export const artifactStudyTranscriptPlay = "fill-primary text-primary";

/** Active transcript line — matches dark Key claims cards (black bg, green time badge). */
export const artifactStudyTranscriptActiveRow = cn(
  "z-10 mx-3 my-1 rounded-2xl border border-white/10 sm:mx-2",
  "bg-gradient-to-br from-stone-900 via-stone-950 to-black",
  "font-semibold shadow-[0_14px_34px_-18px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
  "lg:scale-[1.015]",
);

export const artifactStudyTranscriptActiveTime = cn(
  "inline-flex min-h-[1.75rem] min-w-[3.25rem] max-w-full items-center justify-center",
  "rounded-full border border-[#34C759]/40 bg-[#34C759] px-2.5 py-1",
  "text-center font-display text-[13px] font-semibold tabular-nums leading-none text-white",
  "shadow-[0_4px_12px_-6px_rgba(52,199,89,0.55)] ring-1 ring-[#34C759]/30",
);

export const artifactStudyTranscriptActiveText = "font-semibold text-white";

export const artifactStudyIconWell = {
  chapters: "bg-primary/10 text-primary group-hover:bg-primary/10",
  people: "bg-orange-100 text-orange-600 group-hover:bg-orange-100",
  insights: "bg-sky-100 text-sky-600 group-hover:bg-sky-100",
} as const;

export const artifactContinueCardHover =
  "hover:border-primary/25 hover:shadow-[0_12px_36px_rgba(0,122,255,0.08)]";

export const artifactInsightPreviewCard = cn(
  "flex min-h-[280px] shrink-0 snap-start flex-col justify-between rounded-2xl border p-5 text-left",
  "shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)]",
  "w-[min(280px,42vw)] max-w-[300px]",
);

/** Mobile Key insights hero — dark quote cards on a plain white rail. */
export const artifactMobileInsightHeroCard = cn(
  "flex min-h-[300px] w-full shrink-0 flex-col justify-between rounded-3xl p-5 text-left sm:p-6 md:min-h-[320px] md:p-7",
  "border border-white/10 bg-gradient-to-br from-stone-900 via-stone-950 to-black",
  "shadow-[0_4px_20px_rgba(0,0,0,0.14)] transition active:scale-[0.99]",
);

export const artifactMobileInsightHeroAccents = [
  {
    card: "border-white/15",
    number: artifactInsightClaimNumberColor,
  },
  {
    card: "border-emerald-400/25",
    number: artifactInsightClaimNumberColor,
  },
  {
    card: "border-emerald-400/20",
    number: artifactInsightClaimNumberColor,
  },
  {
    card: "border-emerald-400/20",
    number: artifactInsightClaimNumberColor,
  },
] as const;

export function artifactMobileInsightHeroAccent(index: number) {
  return artifactMobileInsightHeroAccents[index % artifactMobileInsightHeroAccents.length];
}

/** Width for one hero insight slide — sized for viewport minus leading pad and a right peek. */
export const artifactMobileInsightHeroSlide = cn(
  "w-[min(300px,calc(100vw-3.75rem))] min-w-[248px] shrink-0 grow-0",
  "sm:w-[min(340px,calc(100vw-4.25rem))]",
  "md:w-[min(340px,calc(100vw-5rem))]",
);

export const artifactMobileInsightHeroNumber =
  "font-sans text-4xl font-bold tabular-nums leading-none tracking-tight";
export const artifactMobileInsightHeroQuote = cn(
  "font-sans text-lg font-semibold leading-snug text-white line-clamp-6 sm:text-[1.05rem]",
);
/** Transcript excerpt on dark insight cards — sans, readable on charcoal. */
export const artifactMobileInsightHeroSourceQuote = cn(
  "font-sans text-sm leading-relaxed text-white/75 line-clamp-2",
);
export const artifactMobileInsightHeroFooter = "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55";
/** Links + scripture refs on dark insight cards — soft butter yellow on charcoal. */
export const artifactMobileInsightHeroLink = cn(
  "text-xs font-medium text-[#FFE08A] underline-offset-2",
  "hover:text-[#FFF0B8] hover:underline",
);

/** Full-screen claim explore — white page with dark hero cards. */
export const artifactInsightExploreShell = cn(
  "flex h-full min-h-0 flex-col bg-background text-foreground",
);

export const artifactInsightExploreHeader = "shrink-0 border-b border-border/40 px-3 py-2.5";

export const artifactInsightExploreScroll = "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-thin";

/** Primary play CTA on dark explore cards. */
export const artifactInsightExplorePlayButton = cn(
  "inline-flex h-10 items-center gap-2 rounded-full border border-primary/35 bg-primary/10",
  "px-4 text-sm font-semibold text-primary transition hover:bg-primary/20",
);
