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

/** Violet primary accent for artifact study chrome (tabs, CTAs, links). */
export const artifactStudyPrimaryButton = cn(
  "bg-violet-600 text-white shadow-lg hover:bg-violet-700",
);

export const artifactStudyLink = "font-medium text-violet-600 hover:text-violet-700";
export const artifactStudyCount = "text-muted-foreground";
export const artifactStudyTabActive = "border-b-2 border-violet-600 text-foreground";
export const artifactStudyChapterLink = "text-violet-600 hover:text-violet-700";
export const artifactStudyDotActive = "bg-violet-600";
export const artifactStudyTranscriptActive =
  "rounded-lg bg-violet-100/90 ring-1 ring-violet-300/50";
export const artifactStudyTranscriptPlay = "fill-violet-600 text-violet-600";

export const artifactStudyIconWell = {
  chapters: "bg-violet-100 text-violet-600 group-hover:bg-violet-100",
  people: "bg-orange-100 text-orange-600 group-hover:bg-orange-100",
  insights: "bg-sky-100 text-sky-600 group-hover:bg-sky-100",
} as const;

export const artifactContinueCardHover =
  "hover:border-violet-200/80 hover:shadow-[0_12px_36px_rgba(124,58,237,0.08)]";

export const artifactInsightPreviewCard = cn(
  "flex min-h-[280px] shrink-0 snap-start flex-col justify-between rounded-2xl border p-5 text-left",
  "shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)]",
  "w-[min(280px,42vw)] max-w-[300px]",
);
