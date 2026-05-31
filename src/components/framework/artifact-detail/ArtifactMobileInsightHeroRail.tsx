import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  artifactMobileInsightHeroCard,
  artifactMobileInsightHeroAccent,
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
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const railDragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number } | null>(null);
  const draggingRef = useRef(false);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const item = railRef.current?.querySelector<HTMLElement>(`[data-insight-index="${index}"]`);
    item?.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
  }, []);

  useEffect(() => {
    if (!activeClaimId) return;
    const idx = claims.findIndex((c) => c.id === activeClaimId);
    if (idx >= 0) {
      setSelectedIndex(idx);
      scrollToIndex(idx);
    }
  }, [activeClaimId, claims, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  const updateSelectedFromScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    const items = Array.from(rail.querySelectorAll<HTMLElement>("[data-insight-index]"));
    let nearestIndex: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item) => {
      const index = Number(item.dataset.insightIndex);
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
      if (Number.isFinite(index) && distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex == null) return;
    setSelectedIndex((current) => (current === nearestIndex ? current : nearestIndex));
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current != null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateSelectedFromScroll();
    });
  }, [updateSelectedFromScroll]);

  const handleTap = useCallback(
    (claimId: string, index: number, event: MouseEvent<HTMLButtonElement>) => {
      if (draggingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        draggingRef.current = false;
        return;
      }
      setSelectedIndex(index);
      scrollToIndex(index);
      onSelectClaim(claimId);
    },
    [onSelectClaim, scrollToIndex],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current;
    if (!start) return;
    const deltaX = Math.abs(event.clientX - start.x);
    const deltaY = Math.abs(event.clientY - start.y);
    if (deltaX > 8 && deltaX > deltaY) draggingRef.current = true;
  }, []);

  const handlePointerEnd = useCallback(() => {
    pointerStartRef.current = null;
  }, []);

  const handleRailPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;
    railDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: rail.scrollLeft,
    };
    rail.setPointerCapture(event.pointerId);
  }, []);

  const handleRailPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = railDragRef.current;
    const rail = railRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !rail) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (Math.abs(deltaX) <= 4 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    draggingRef.current = true;
    rail.scrollLeft = drag.scrollLeft - deltaX;
    event.preventDefault();
  }, []);

  const handleRailPointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = railDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    railDragRef.current = null;
    railRef.current?.releasePointerCapture(event.pointerId);
    updateSelectedFromScroll();
  }, [updateSelectedFromScroll]);

  const selectInsight = useCallback((index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), claims.length - 1);
    setSelectedIndex(nextIndex);
    scrollToIndex(nextIndex);
  }, [claims.length, scrollToIndex]);

  if (claims.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={railRef}
        className="-mx-3 cursor-grab touch-pan-y snap-x snap-mandatory overflow-x-auto scroll-smooth pb-3 pt-0.5 active:cursor-grabbing [-webkit-overflow-scrolling:touch] [scroll-padding-inline:0.75rem] [scrollbar-width:thin] sm:-mx-4 sm:[scroll-padding-inline:1rem]"
        role="list"
        aria-label="Key insight cards"
        onScroll={handleScroll}
        onPointerDown={handleRailPointerDown}
        onPointerMove={handleRailPointerMove}
        onPointerCancel={handleRailPointerEnd}
        onPointerUp={handleRailPointerEnd}
      >
        <div className="flex min-w-min gap-3 px-3 sm:px-4">
          {claims.map((claim, idx) => {
            const primaryRef = claim.scripture_supports?.[0]?.ref;
            const accent = artifactMobileInsightHeroAccent(idx);
            return (
              <div
                key={claim.id}
                className={cn(artifactMobileInsightHeroSlide, "snap-start")}
                role="listitem"
                data-insight-index={idx}
              >
                <button
                  type="button"
                  className={cn(
                    artifactMobileInsightHeroCard,
                    accent.card,
                    activeClaimId === claim.id && "ring-2 ring-violet-500/50 ring-offset-2 ring-offset-background",
                  )}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerCancel={handlePointerEnd}
                  onPointerUp={handlePointerEnd}
                  onClick={(event) => handleTap(claim.id, idx, event)}
                >
                  <div className="space-y-4 text-left">
                    <span className={cn(artifactMobileInsightHeroNumber, accent.number)}>{idx + 1}</span>
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
              </div>
            );
          })}
        </div>
      </div>
      {claims.length > 1 ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            aria-label="Previous insight"
            disabled={selectedIndex === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => selectInsight(selectedIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex items-center gap-2">
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
                  onClick={() => selectInsight(idx)}
                />
              ))}
            </div>
            <span className="min-w-8 text-center text-[11px] font-semibold text-muted-foreground">
              {selectedIndex + 1}/{claims.length}
            </span>
          </div>
          <button
            type="button"
            aria-label="Next insight"
            disabled={selectedIndex === claims.length - 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => selectInsight(selectedIndex + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
