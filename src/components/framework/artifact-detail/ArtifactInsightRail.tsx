import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactHorizontalRail } from "@/lib/framework/artifactSurfaces";
import {
  artifactMobileInsightHeroAccent,
  artifactMobileInsightHeroCard,
  artifactMobileInsightHeroLink,
  artifactMobileInsightHeroNumber,
  artifactMobileInsightHeroQuote,
} from "@/lib/framework/artifactStudyTheme";
import { cleanTranscriptQuoteForDisplay } from "@/lib/normalizePastedTranscript";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

type ClaimLike = {
  id: string;
  claim: string;
  verdict: string | null;
  scripture_supports?: { ref: string; note?: string }[];
};

type Props<T extends ClaimLike> = {
  claims: T[];
  claimSources?: Record<string, TranscriptSegment | null>;
  activeClaimId?: string | null;
  onSelectClaim: (claimId: string) => void;
  onSeeInTranscript?: (claimId: string) => void;
  onSeeScripture?: (claimId: string) => void;
  showScrollNav?: boolean;
  className?: string;
};

export default function ArtifactInsightRail<T extends ClaimLike>({
  claims,
  claimSources,
  activeClaimId,
  onSelectClaim,
  onSeeInTranscript,
  onSeeScripture,
  showScrollNav = true,
  className,
}: Props<T>) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = useCallback((direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const step = Math.min(320, el.clientWidth * 0.85);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  if (claims.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {showScrollNav && claims.length > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous insight"
            className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full border-border/60 bg-white shadow-md hover:bg-white lg:inline-flex"
            onClick={() => scrollRail(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next insight"
            className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 rounded-full border-border/60 bg-white shadow-md hover:bg-white lg:inline-flex"
            onClick={() => scrollRail(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </>
      ) : null}

      <div
        ref={railRef}
        className={cn(
          artifactHorizontalRail,
          "gap-4 rounded-2xl bg-white pb-2 pt-1 -mx-0.5 px-0.5",
        )}
        role="list"
        aria-label="Key claims"
      >
        {claims.map((claim, idx) => {
          const accent = artifactMobileInsightHeroAccent(idx);
          const source = claimSources?.[claim.id];
          const sourceQuote = source?.text ? cleanTranscriptQuoteForDisplay(source.text) : "";
          const primaryRef = claim.scripture_supports?.[0]?.ref;

          return (
            <article
              key={claim.id}
              role="listitem"
              className={cn(
                "w-[min(280px,42vw)] max-w-[300px] shrink-0 snap-start",
                activeClaimId === claim.id && "ring-2 ring-violet-500/50 ring-offset-2 ring-offset-white",
              )}
            >
              <button
                type="button"
                className={cn(
                  artifactMobileInsightHeroCard,
                  accent.card,
                  "h-full w-full transition hover:scale-[1.01] active:scale-[0.99]",
                )}
                onClick={() => onSelectClaim(claim.id)}
              >
                <div className="space-y-4 text-left">
                  <span
                    className={cn(artifactMobileInsightHeroNumber, accent.number)}
                    aria-label={`Claim ${idx + 1}`}
                  >
                    {idx + 1}
                  </span>
                  <p className={cn(artifactMobileInsightHeroQuote, "line-clamp-4")}>{claim.claim}</p>
                  {sourceQuote ? (
                    <p className="font-scripture text-sm leading-relaxed text-white/60 line-clamp-2">
                      &ldquo;{sourceQuote}&rdquo;
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                    {onSeeInTranscript ? (
                      <span
                        role="link"
                        tabIndex={0}
                        className={cn(artifactMobileInsightHeroLink, "underline-offset-2 hover:underline")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeeInTranscript(claim.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onSeeInTranscript(claim.id);
                          }
                        }}
                      >
                        See in transcript
                      </span>
                    ) : null}
                    {onSeeScripture ? (
                      <span
                        role="link"
                        tabIndex={0}
                        className={cn(artifactMobileInsightHeroLink, "underline-offset-2 hover:underline")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeeScripture(claim.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onSeeScripture(claim.id);
                          }
                        }}
                      >
                        See scripture
                      </span>
                    ) : null}
                  </div>
                  {primaryRef ? (
                    <p className={cn("text-xs font-semibold tracking-tight", artifactMobileInsightHeroLink)}>
                      {primaryRef}
                    </p>
                  ) : null}
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
