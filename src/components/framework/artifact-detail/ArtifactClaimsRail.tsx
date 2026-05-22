import { useCallback, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  artifactDesktopClaimsRail,
  artifactMobileClaimsRail,
  artifactPremiumCard,
} from "@/lib/framework/artifactSurfaces";
import { artifactStudyChapterLink } from "@/lib/framework/artifactStudyTheme";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";
import type { ClaimChapterGroup } from "@/lib/framework/groupClaimsUnderYoutubeChapters";

type Props<T extends { id: string }> = {
  grouped: boolean;
  groups: ClaimChapterGroup<T>[];
  claims: T[];
  renderClaimCard: (claim: T, claimIndex: number) => ReactNode;
  youTubeVideoId: string | null;
  onSeekChapter?: (seconds: number) => void;
  showScrollNav?: boolean;
  variant?: "desktop" | "mobile";
  className?: string;
};

export default function ArtifactClaimsRail<T extends { id: string }>({
  grouped,
  groups,
  claims,
  renderClaimCard,
  youTubeVideoId,
  onSeekChapter,
  showScrollNav = true,
  variant = "desktop",
  className,
}: Props<T>) {
  const isMobile = variant === "mobile";
  const railRef = useRef<HTMLDivElement>(null);
  const indexFor = (claim: T) => Math.max(0, claims.findIndex((x) => x.id === claim.id));

  const scrollRail = useCallback((direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const step = Math.min(isMobile ? 320 : 440, el.clientWidth * 0.88);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, [isMobile]);

  const railContent = (
    <div
      ref={railRef}
      className={cn(isMobile ? artifactMobileClaimsRail : artifactDesktopClaimsRail, className)}
      role="list"
      aria-label="Claims"
    >
      {grouped
        ? groups.map((group) => (
            <div key={group.id} className="flex shrink-0 snap-start items-stretch gap-4" role="group">
              <div
                className={cn(
                  artifactPremiumCard,
                  "flex w-[11rem] shrink-0 flex-col justify-between self-stretch rounded-2xl border-border/60 bg-white p-4",
                )}
                aria-label={`Chapter: ${group.title}`}
              >
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Chapter
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-snug text-foreground line-clamp-4">
                    {group.title}
                  </p>
                </div>
                {group.chapterStartSeconds != null ? (
                  youTubeVideoId && onSeekChapter ? (
                    <button
                      type="button"
                      className={cn(
                        "mt-3 font-mono text-xs tabular-nums underline-offset-2 hover:underline",
                        artifactStudyChapterLink,
                      )}
                      onClick={() => onSeekChapter(group.chapterStartSeconds!)}
                    >
                      {formatTranscriptClock(group.chapterStartSeconds)}
                    </button>
                  ) : (
                    <span className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTranscriptClock(group.chapterStartSeconds)}
                    </span>
                  )
                ) : null}
              </div>
              {group.claims.map((claim) => (
                <div key={claim.id} role="listitem">
                  {renderClaimCard(claim, indexFor(claim))}
                </div>
              ))}
            </div>
          ))
        : claims.map((claim, idx) => (
            <div key={claim.id} role="listitem">
              {renderClaimCard(claim, idx)}
            </div>
          ))}
    </div>
  );

  if (!showScrollNav) return railContent;

  return (
    <div className="relative">
      {claims.length > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous claim"
            className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full border-border/60 bg-background/95 shadow-md backdrop-blur-sm hover:bg-background lg:inline-flex"
            onClick={() => scrollRail(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next claim"
            className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full border-border/60 bg-background/95 shadow-md backdrop-blur-sm hover:bg-background lg:inline-flex"
            onClick={() => scrollRail(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </>
      ) : null}
      {railContent}
    </div>
  );
}
