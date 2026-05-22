import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  artifactMobileInsightHeroCard,
  artifactMobileInsightHeroFooter,
  artifactMobileInsightHeroLink,
  artifactMobileInsightHeroNumber,
  artifactMobileInsightHeroQuote,
  artifactMobileInsightHeroSlide,
  artifactStudyDotActive,
} from "@/lib/framework/artifactStudyTheme";
import { cn } from "@/lib/utils";

type ClaimLike = {
  id: string;
  claim: string;
  scripture_supports?: { ref: string; note?: string }[];
};

type Props<T extends ClaimLike> = {
  claims: T[];
  activeClaimId?: string | null;
  onSelectClaim: (claimId: string) => void;
  onSeeScripture?: (claimId: string) => void;
  className?: string;
};

export default function ArtifactMobileInsightHeroRail<T extends ClaimLike>({
  claims,
  activeClaimId,
  onSelectClaim,
  onSeeScripture,
  className,
}: Props<T>) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!activeClaimId || !api) return;
    const idx = claims.findIndex((c) => c.id === activeClaimId);
    if (idx >= 0 && idx !== api.selectedScrollSnap()) api.scrollTo(idx);
  }, [activeClaimId, api, claims]);

  const handleTap = useCallback(
    (claimId: string) => {
      onSelectClaim(claimId);
    },
    [onSelectClaim],
  );

  if (claims.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <Carousel
        setApi={setApi}
        opts={{ align: "start", containScroll: "trimSnaps" }}
        className="-mx-3 w-[calc(100%+1.5rem)] sm:-mx-4 sm:w-[calc(100%+2rem)]"
      >
        <CarouselContent className="-ml-3 pl-3 sm:pl-4">
          {claims.map((claim, idx) => {
            const primaryRef = claim.scripture_supports?.[0]?.ref;
            return (
              <CarouselItem key={claim.id} className={cn(artifactMobileInsightHeroSlide, "pl-0 pr-3")}>
                <button
                  type="button"
                  className={cn(
                    artifactMobileInsightHeroCard,
                    activeClaimId === claim.id && "ring-2 ring-violet-500/50 ring-offset-2 ring-offset-background",
                  )}
                  onClick={() => handleTap(claim.id)}
                >
                  <div className="space-y-4 text-left">
                    <span className={artifactMobileInsightHeroNumber}>#{idx + 1}</span>
                    <p className={artifactMobileInsightHeroQuote}>{claim.claim}</p>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <span className={artifactMobileInsightHeroFooter}>Tap to explore</span>
                    {primaryRef && onSeeScripture ? (
                      <span
                        role="link"
                        tabIndex={0}
                        className={cn(
                          "inline-flex items-center gap-1",
                          artifactMobileInsightHeroLink,
                        )}
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
                        <BookOpen className="h-3.5 w-3.5" aria-hidden />
                        See scripture
                      </span>
                    ) : primaryRef ? (
                      <span className={cn("text-xs", artifactMobileInsightHeroLink)}>{primaryRef}</span>
                    ) : null}
                  </div>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      {claims.length > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Key insights">
          {claims.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === selectedIndex}
              aria-label={`Insight ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === selectedIndex ? cn("w-5", artifactStudyDotActive) : "w-1.5 bg-muted-foreground/35",
              )}
              onClick={() => api?.scrollTo(idx)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
