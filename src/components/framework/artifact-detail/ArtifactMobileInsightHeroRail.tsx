import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  artifactMobileStudyContentInset,
  artifactMobileStudyRailLeadingPad,
} from "@/lib/framework/artifactSurfaces";
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

const TAP_MOVE_THRESHOLD_PX = 12;
const MAX_FLICK_VELOCITY = 1.2;
const MOMENTUM_PROJECTION_MS = 300;

/** Scripture link only — card buttons must allow horizontal rail drag on touch. */
function isInteractiveInsightTarget(target: EventTarget | null) {
  return Boolean(
    target instanceof Element &&
      target.closest("a[href], [role='link'][tabindex], [data-insight-no-drag]"),
  );
}

function clampVelocity(velocity: number) {
  return Math.min(Math.max(velocity, -MAX_FLICK_VELOCITY), MAX_FLICK_VELOCITY);
}

function insightIndexFromTarget(target: EventTarget | null) {
  const slide = (target as Element | null)?.closest<HTMLElement>("[data-insight-index]");
  if (!slide) return null;
  const index = Number(slide.dataset.insightIndex);
  return Number.isFinite(index) ? index : null;
}

export default function ArtifactMobileInsightHeroRail<T extends ClaimLike>({
  claims,
  activeClaimId,
  onSelectClaim,
  onSeeScripture,
  className,
}: Props<T>) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const railDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    insightIndex: number | null;
  } | null>(null);
  const draggingRef = useRef(false);

  const getInsightOffsets = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return [];
    return Array.from(rail.querySelectorAll<HTMLElement>("[data-insight-index]")).map((item) => item.offsetLeft);
  }, []);

  const clampOffset = useCallback((offset: number) => {
    const offsets = getInsightOffsets();
    if (offsets.length === 0) return 0;
    const maxOffset = offsets[offsets.length - 1] ?? 0;
    return Math.min(Math.max(offset, 0), maxOffset);
  }, [getInsightOffsets]);

  const nearestIndexForOffset = useCallback((offset: number) => {
    const offsets = getInsightOffsets();
    if (offsets.length === 0) return 0;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    offsets.forEach((itemOffset, index) => {
      const distance = Math.abs(itemOffset - offset);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }, [getInsightOffsets]);

  const scrollToIndex = useCallback((index: number) => {
    const item = railRef.current?.querySelector<HTMLElement>(`[data-insight-index="${index}"]`);
    if (item) setTrackOffset(item.offsetLeft);
  }, []);

  useEffect(() => {
    if (!activeClaimId) return;
    const idx = claims.findIndex((c) => c.id === activeClaimId);
    if (idx >= 0) {
      setSelectedIndex(idx);
      scrollToIndex(idx);
    }
  }, [activeClaimId, claims, scrollToIndex]);

  const handleTap = useCallback(
    (claimId: string, index: number) => {
      setSelectedIndex(index);
      scrollToIndex(index);
      onSelectClaim(claimId);
    },
    [onSelectClaim, scrollToIndex],
  );

  const handleRailPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (isInteractiveInsightTarget(event.target)) return;
    draggingRef.current = false;
    railDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: trackOffset,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      insightIndex: insightIndexFromTarget(event.target),
    };
  }, [trackOffset]);

  const handleRailPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = railDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) <= 4 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (!draggingRef.current) {
      railRef.current?.setPointerCapture?.(event.pointerId);
    }

    const elapsedMs = Math.max(event.timeStamp - drag.lastTime, 1);
    drag.velocity = (drag.lastX - event.clientX) / elapsedMs;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    draggingRef.current = true;
    setIsDragging(true);
    setTrackOffset(clampOffset(drag.startOffset - deltaX));
    event.preventDefault();
  }, [clampOffset]);

  const handleRailPointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = railDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    railDragRef.current = null;
    if (railRef.current?.hasPointerCapture?.(event.pointerId)) {
      railRef.current.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);

    const deltaX = Math.abs(event.clientX - drag.startX);
    const deltaY = Math.abs(event.clientY - drag.startY);
    if (deltaX <= TAP_MOVE_THRESHOLD_PX && deltaY <= TAP_MOVE_THRESHOLD_PX) {
      draggingRef.current = false;
      if (!isInteractiveInsightTarget(event.target)) {
        const index =
          drag.insightIndex ??
          insightIndexFromTarget(event.target);
        const claim = index != null ? claims[index] : undefined;
        if (claim) handleTap(claim.id, index);
      }
      return;
    }

    if (!draggingRef.current) return;
    const releaseOffset = clampOffset(drag.startOffset - (event.clientX - drag.startX));
    const momentumOffset = clampOffset(releaseOffset + clampVelocity(drag.velocity) * MOMENTUM_PROJECTION_MS);
    const nextIndex = nearestIndexForOffset(momentumOffset);
    setSelectedIndex(nextIndex);
    scrollToIndex(nextIndex);
    draggingRef.current = false;
  }, [claims, clampOffset, handleTap, nearestIndexForOffset, scrollToIndex]);

  const handleCardPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      draggingRef.current = false;
      if (!isInteractiveInsightTarget(event.target)) {
        handleRailPointerDown(event as unknown as PointerEvent<HTMLDivElement>);
        event.stopPropagation();
      }
    },
    [handleRailPointerDown],
  );

  const handleCardPointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (isInteractiveInsightTarget(event.target)) return;
      handleRailPointerMove(event as unknown as PointerEvent<HTMLDivElement>);
      event.stopPropagation();
    },
    [handleRailPointerMove],
  );

  const handleCardPointerUp = useCallback(
    (_claimId: string, _index: number, event: PointerEvent<HTMLButtonElement>) => {
      if (!isInteractiveInsightTarget(event.target)) {
        handleRailPointerEnd(event as unknown as PointerEvent<HTMLDivElement>);
        event.stopPropagation();
      }
    },
    [handleRailPointerEnd],
  );

  const handleCardClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (draggingRef.current) {
      event.preventDefault();
      event.stopPropagation();
      draggingRef.current = false;
    }
  }, []);

  const selectInsight = useCallback((index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), claims.length - 1);
    setSelectedIndex(nextIndex);
    scrollToIndex(nextIndex);
  }, [claims.length, scrollToIndex]);

  if (claims.length === 0) return null;

  return (
    <div className={cn("w-full min-w-0 max-w-none space-y-4", className)}>
      <div
        ref={railRef}
        className={cn(
          "w-full max-w-none cursor-grab overflow-hidden active:cursor-grabbing",
          artifactMobileStudyRailLeadingPad,
          "touch-pan-x overscroll-x-contain",
          isDragging && "touch-none",
        )}
        role="list"
        aria-label="Key insight cards"
        onPointerDown={handleRailPointerDown}
        onPointerMove={handleRailPointerMove}
        onPointerCancel={handleRailPointerEnd}
        onPointerUp={handleRailPointerEnd}
      >
        <div
          ref={trackRef}
          className={cn(
            "flex w-max gap-3 md:gap-4",
            isDragging ? "transition-none" : "transition-transform duration-500 ease-out",
          )}
          style={{ transform: `translate3d(-${trackOffset}px, 0, 0)` }}
        >
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
                    activeClaimId === claim.id && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
                  )}
                  onPointerDown={handleCardPointerDown}
                  onPointerMove={handleCardPointerMove}
                  onPointerCancel={(event) => {
                    handleRailPointerEnd(event as unknown as PointerEvent<HTMLDivElement>);
                  }}
                  onPointerUp={(event) => handleCardPointerUp(claim.id, idx, event)}
                  onClick={handleCardClick}
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
        <div className={cn("flex w-full max-w-none items-center justify-between gap-3", artifactMobileStudyContentInset)}>
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
