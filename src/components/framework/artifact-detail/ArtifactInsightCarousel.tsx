import { useCallback, useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  artifactInsightPreviewCard,
  artifactPastelTint,
  artifactStudyDotActive,
  artifactStudyLink,
  formatInsightClaimNumber,
} from "@/lib/framework/artifactStudyTheme";
import { formatClaimVerdict, isDeferredVerdict } from "@/lib/framework/claimVerdict";
import { cn } from "@/lib/utils";

type ClaimLike = {
  id: string;
  claim: string;
  verdict: string | null;
  scripture_supports?: { ref: string; note?: string }[];
};

type Props<T extends ClaimLike> = {
  claims: T[];
  activeClaimId?: string | null;
  onSelectClaim: (claimId: string) => void;
  variant?: "mobile" | "desktop";
  onSeeScripture?: (claimId: string) => void;
  onMarkReviewed?: (claimId: string) => void;
  className?: string;
};

export default function ArtifactInsightCarousel<T extends ClaimLike>({
  claims,
  activeClaimId,
  onSelectClaim,
  variant = "mobile",
  onSeeScripture,
  onMarkReviewed,
  className,
}: Props<T>) {
  const isDesktop = variant === "desktop";
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollToClaim = useCallback(
    (claimId: string) => {
      const idx = claims.findIndex((c) => c.id === claimId);
      if (idx >= 0) api?.scrollTo(idx);
    },
    [api, claims],
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const idx = api.selectedScrollSnap();
      setSelectedIndex(idx);
      const claim = claims[idx];
      if (claim) onSelectClaim(claim.id);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, claims, onSelectClaim]);

  useEffect(() => {
    if (!activeClaimId || !api) return;
    const idx = claims.findIndex((c) => c.id === activeClaimId);
    if (idx >= 0 && idx !== api.selectedScrollSnap()) {
      api.scrollTo(idx);
    }
  }, [activeClaimId, api, claims]);

  if (claims.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className={cn("relative", isDesktop && "px-10")}>
        <Carousel setApi={setApi} opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
          {isDesktop ? (
            <>
              <CarouselPrevious className="left-0 h-9 w-9 rounded-full border-border/50 bg-background/95 shadow-md hover:bg-background" />
              <CarouselNext className="right-0 h-9 w-9 rounded-full border-border/50 bg-background/95 shadow-md hover:bg-background" />
            </>
          ) : null}
          <CarouselContent className={cn(isDesktop ? "-ml-4" : "-ml-3")}>
            {claims.map((claim, idx) => {
              const tint = artifactPastelTint(idx);
              const primaryRef = claim.scripture_supports?.[0]?.ref;

              return (
                <CarouselItem
                  key={claim.id}
                  className={cn(
                    isDesktop
                      ? "basis-[min(100%,300px)] pl-4 md:basis-[min(48%,300px)]"
                      : "basis-[88%] pl-3 sm:basis-[85%]",
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      artifactInsightPreviewCard,
                      "w-full max-w-none",
                      tint.card,
                      isDesktop && "min-h-[260px]",
                    )}
                    onClick={() => {
                      scrollToClaim(claim.id);
                      onSelectClaim(claim.id);
                    }}
                  >
                    <div className="space-y-3 text-left">
                      <span
                        className={cn(
                          "font-display text-4xl font-semibold tabular-nums leading-none",
                          tint.number,
                        )}
                      >
                        {formatInsightClaimNumber(idx)}
                      </span>
                      <p
                        className={cn(
                          "font-display font-semibold leading-snug text-foreground",
                          isDesktop ? "text-base line-clamp-4" : "text-[15px] line-clamp-5",
                        )}
                      >
                        {claim.claim}
                      </p>
                      {primaryRef ? (
                        <p className={cn("text-xs font-semibold", tint.ref)}>{primaryRef}</p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-2">
                      {isDesktop ? (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
                          {onSeeScripture ? (
                            <span
                              role="link"
                              tabIndex={0}
                              className={cn(tint.link, "underline-offset-2 hover:underline")}
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
                          {onMarkReviewed ? (
                            <span
                              role="link"
                              tabIndex={0}
                              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkReviewed(claim.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onMarkReviewed(claim.id);
                                }
                              }}
                            >
                              Mark reviewed
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", artifactStudyLink)}>
                          Tap to review
                        </span>
                      )}
                      {claim.verdict ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                            isDeferredVerdict(claim.verdict)
                              ? "bg-amber-100 text-amber-900"
                              : "bg-white/80 text-foreground shadow-sm",
                          )}
                        >
                          {formatClaimVerdict(claim.verdict)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>
      {claims.length > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Insight slides">
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
