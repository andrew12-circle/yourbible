import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import ArtifactClaimsRail from "@/components/framework/artifact-detail/ArtifactClaimsRail";
import ArtifactInsightCarousel from "@/components/framework/artifact-detail/ArtifactInsightCarousel";
import ArtifactMobileClaimShell from "@/components/framework/artifact-detail/ArtifactMobileClaimShell";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import {
  renderArtifactDetailClaimCard,
  type RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import ClaimsGlossary, { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import ClaimsPlaybackToolbar from "@/components/framework/artifact-detail/ClaimsPlaybackToolbar";
import { useIsDesktop } from "@/hooks/use-desktop";
import { findActiveClaimId } from "@/lib/framework/claimPlaybackSync";
import {
  artifactPremiumCard,
  artifactScrollMtMobile,
  artifactScrollMtMobilePane,
} from "@/lib/framework/artifactSurfaces";
import type { ClaimChapterGroup } from "@/lib/framework/groupClaimsUnderYoutubeChapters";
import { scrollArtifactClaimIntoView } from "@/lib/framework/scrollArtifactClaimIntoView";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

type ClaimLike = { id: string; claim: string; verdict: string | null };

type Props<T extends ClaimLike> = {
  /** Hash scroll target (e.g. `claims`). Omit when a parent section already owns the anchor. */
  anchorId?: string;
  claims: T[];
  claimChapterLayout: { grouped: boolean; groups: ClaimChapterGroup<T>[] };
  glossaryEntries: ClaimsGlossaryEntry[];
  youTubeVideoId: string | null;
  onJumpToClaim: (claimId: string) => void;
  onSeekChapter: (seconds: number) => void;
  claimCardContext: RenderClaimCardContext;
  /** Mobile: one claim open at a time; first claim open by default. */
  mobileOpenClaimId?: string | null;
  onMobileOpenClaimIdChange?: (claimId: string | null) => void;
  /** Persist claims-index open state per artifact. */
  claimsIndexStorageKey?: string;
  /** Resolve seek time per claim (transcript line or chapter). */
  getClaimSeekSeconds?: (claim: T) => number | null;
  playerReady?: boolean;
  isPlaying?: boolean;
  getPlaybackSeconds?: () => number;
  onTogglePlayback?: () => void;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  pinnedVideoPane?: boolean;
  onSeeScripture?: (claimId: string) => void;
  onMarkReviewed?: (claimId: string) => void;
  /** Desktop overview already shows insight rail — hide duplicate carousel here. */
  hideInsightPreview?: boolean;
};

export default function ArtifactClaimsSection<T extends ClaimLike>({
  anchorId,
  claims,
  claimChapterLayout,
  glossaryEntries,
  youTubeVideoId,
  onJumpToClaim,
  onSeekChapter,
  claimCardContext,
  mobileOpenClaimId,
  onMobileOpenClaimIdChange,
  claimsIndexStorageKey,
  getClaimSeekSeconds,
  playerReady = false,
  isPlaying = false,
  getPlaybackSeconds,
  onTogglePlayback,
  scrollContainerRef,
  pinnedVideoPane = false,
  onSeeScripture,
  onMarkReviewed,
  hideInsightPreview = false,
}: Props<T>) {
  const isDesktop = useIsDesktop();
  const useMobileAccordion = onMobileOpenClaimIdChange != null;
  const [followPlayback, setFollowPlayback] = useState(true);
  const [playbackTick, setPlaybackTick] = useState(0);
  const prevActiveClaimIdRef = useRef<string | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const userPausedFollowUntilRef = useRef(0);
  const defaultedFollowOnReadyRef = useRef(false);

  const timedClaimsCount = useMemo(() => {
    if (!getClaimSeekSeconds) return 0;
    return claims.filter((c) => getClaimSeekSeconds(c) != null).length;
  }, [claims, getClaimSeekSeconds]);

  const showFollowControl = Boolean(youTubeVideoId && playerReady && getClaimSeekSeconds && timedClaimsCount > 0);
  const showPlaybackControl = Boolean(youTubeVideoId && playerReady && onTogglePlayback);
  const useClaimsRail = isDesktop && hideInsightPreview;

  const seekForClaim = useCallback(
    (claim: T) => (getClaimSeekSeconds ? getClaimSeekSeconds(claim) : null),
    [getClaimSeekSeconds],
  );

  const activeClaimId = useMemo(() => {
    if (!showFollowControl || !getPlaybackSeconds) return null;
    void playbackTick;
    return findActiveClaimId(claims, seekForClaim, getPlaybackSeconds());
  }, [showFollowControl, getPlaybackSeconds, claims, seekForClaim, playbackTick]);

  const renderClaimCard = useCallback(
    (claim: T, claimIndex: number) =>
      renderArtifactDetailClaimCard(claim, claimIndex, {
        ...claimCardContext,
        layout: useClaimsRail ? "desktopRail" : claimCardContext.layout ?? "stack",
        activeClaimId: activeClaimId ?? null,
        followPlaybackActive: followPlayback,
      }),
    [claimCardContext, useClaimsRail, activeClaimId, followPlayback],
  );

  useEffect(() => {
    if (!playerReady) return;
    const ms = followPlayback ? 250 : 500;
    const id = window.setInterval(() => setPlaybackTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [playerReady, followPlayback]);

  useEffect(() => {
    if (!playerReady || defaultedFollowOnReadyRef.current) return;
    defaultedFollowOnReadyRef.current = true;
    setFollowPlayback(true);
  }, [playerReady]);

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current != null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 600);
  }, []);

  useEffect(() => {
    if (!playerReady || !activeClaimId || !followPlayback || !isPlaying) return;
    if (Date.now() < userPausedFollowUntilRef.current) return;

    const claimChanged = prevActiveClaimIdRef.current !== activeClaimId;
    prevActiveClaimIdRef.current = activeClaimId;

    if (useMobileAccordion && onMobileOpenClaimIdChange && claimChanged) {
      onMobileOpenClaimIdChange(activeClaimId);
    }

    const el = document.getElementById(activeClaimId);
    if (!el) return;

    const scrollRoot = scrollContainerRef?.current;
    const rect = el.getBoundingClientRect();
    const edgeMargin = 72;
    const bounds = scrollRoot?.getBoundingClientRect();
    const inView = bounds
      ? useClaimsRail
        ? rect.left >= bounds.left + edgeMargin &&
          rect.right <= bounds.right - edgeMargin &&
          rect.top >= bounds.top + edgeMargin &&
          rect.bottom <= bounds.bottom - edgeMargin
        : rect.top >= bounds.top + edgeMargin && rect.bottom <= bounds.bottom - edgeMargin
      : rect.top >= edgeMargin && rect.bottom <= window.innerHeight - edgeMargin;
    if (!claimChanged && inView) return;

    markProgrammaticScroll();
    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: useClaimsRail ? "center" : "nearest",
    });
  }, [
    playerReady,
    activeClaimId,
    followPlayback,
    isPlaying,
    playbackTick,
    useMobileAccordion,
    onMobileOpenClaimIdChange,
    markProgrammaticScroll,
    scrollContainerRef,
    useClaimsRail,
  ]);

  useEffect(() => {
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      userPausedFollowUntilRef.current = Date.now() + 2500;
      setFollowPlayback(false);
    };
    let cleanup: (() => void) | undefined;
    const attach = () => {
      const root = scrollContainerRef?.current;
      if (root) {
        root.addEventListener("scroll", onScroll, { passive: true });
        cleanup = () => root.removeEventListener("scroll", onScroll);
        return;
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => window.removeEventListener("scroll", onScroll);
    };
    const raf = requestAnimationFrame(attach);
    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [scrollContainerRef, pinnedVideoPane]);

  const wrapCard = (claim: T, claimIndex: number) => {
    const isActive = activeClaimId === claim.id && followPlayback;
    const card = renderClaimCard(claim, claimIndex);
    if (!useMobileAccordion) {
      if (!isActive) return card;
      return (
        <div
          key={claim.id}
          data-claim-playback-active
          className="rounded-lg ring-2 ring-primary/45 ring-offset-2 ring-offset-amber-50/80 dark:ring-offset-amber-950/40"
        >
          {card}
        </div>
      );
    }
    const claimNumber = claimIndex + 1;
    return (
      <ArtifactMobileClaimShell
        key={claim.id}
        claim={claim}
        claimNumber={claimNumber}
        playbackActive={isActive}
        pinnedVideoPane={pinnedVideoPane}
        open={mobileOpenClaimId === claim.id}
        onOpenChange={(open) => {
          if (open) onMobileOpenClaimIdChange(claim.id);
          else if (mobileOpenClaimId === claim.id) onMobileOpenClaimIdChange(null);
        }}
      >
        {card}
      </ArtifactMobileClaimShell>
    );
  };

  const handleCarouselSelect = useCallback(
    (claimId: string) => {
      onMobileOpenClaimIdChange?.(claimId);
      markProgrammaticScroll();
      requestAnimationFrame(() => {
        scrollArtifactClaimIntoView(document.getElementById(claimId), {
          horizontalRail: useClaimsRail,
        });
      });
    },
    [onMobileOpenClaimIdChange, markProgrammaticScroll],
  );

  const claimsList = useClaimsRail ? (
    <ArtifactClaimsRail
      grouped={claimChapterLayout.grouped}
      groups={claimChapterLayout.groups}
      claims={claims}
      renderClaimCard={renderClaimCard}
      youTubeVideoId={youTubeVideoId}
      onSeekChapter={onSeekChapter}
    />
  ) : (
    <div className={isDesktop ? "space-y-8" : "space-y-3"}>
      {claimChapterLayout.grouped ? (
        claimChapterLayout.groups.map((group) => (
          <div key={group.id} className={isDesktop ? "space-y-3" : "space-y-2"}>
            <div
              className={cn(
                "sticky top-0 z-[5] flex items-center justify-between gap-2 text-sm font-medium text-foreground",
                isDesktop
                  ? "-mx-1 mb-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2"
                  : "mb-0 border-b border-border/40 bg-background/95 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
              )}
            >
              <span className="min-w-0 leading-snug">{group.title}</span>
              {group.chapterStartSeconds != null ? (
                youTubeVideoId ? (
                  <button
                    type="button"
                    className="shrink-0 font-mono text-xs font-normal tabular-nums text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => onSeekChapter(group.chapterStartSeconds!)}
                  >
                    {formatTranscriptClock(group.chapterStartSeconds)}
                  </button>
                ) : (
                  <span className="shrink-0 font-mono text-xs font-normal tabular-nums text-muted-foreground">
                    {formatTranscriptClock(group.chapterStartSeconds)}
                  </span>
                )
              ) : null}
            </div>
            <div className={isDesktop ? "space-y-5" : "space-y-3"}>
              {group.claims.map((c) => wrapCard(c, Math.max(0, claims.findIndex((x) => x.id === c.id))))}
            </div>
          </div>
        ))
      ) : (
        <div className={isDesktop ? "space-y-5" : "space-y-3"}>{claims.map((c, i) => wrapCard(c, i))}</div>
      )}
    </div>
  );

  return (
    <div
      id={anchorId}
      className={cn(
        useClaimsRail ? "max-w-none scroll-mt-28" : "max-w-4xl",
        isDesktop && !useClaimsRail && "scroll-mt-24",
        !isDesktop && (pinnedVideoPane ? artifactScrollMtMobilePane : artifactScrollMtMobile),
      )}
    >
      {isDesktop ? (
        <div className="space-y-8">
          {!hideInsightPreview ? (
            <div className="space-y-4">
              <ArtifactStudySectionHeader
                title="Key insights"
                count={claims.length}
                countLabel={`${claims.length} insights`}
                description="Swipe through thesis-sized lines from the transcript — open any card below for scripture and verdicts."
              />
              <ArtifactInsightCarousel
                claims={claims}
                activeClaimId={activeClaimId ?? mobileOpenClaimId}
                onSelectClaim={handleCarouselSelect}
                variant="desktop"
                onSeeScripture={onSeeScripture}
                onMarkReviewed={onMarkReviewed}
              />
            </div>
          ) : (
            <ArtifactStudySectionHeader
              title="Key claims"
              count={claims.length}
              countLabel={`${claims.length} claims extracted`}
              description="Scroll sideways — transcript source, scripture, and verdict actions stay on each card."
            />
          )}
          {(showFollowControl || showPlaybackControl) && (
            <ClaimsPlaybackToolbar
              isPlaying={isPlaying}
              onTogglePlayback={onTogglePlayback}
              showPlaybackControl={showPlaybackControl}
              followPlayback={followPlayback}
              onToggleFollowPlayback={() => {
                setFollowPlayback((v) => {
                  const next = !v;
                  if (next) prevActiveClaimIdRef.current = null;
                  return next;
                });
              }}
              showFollowControl={showFollowControl}
              timedClaimsCount={timedClaimsCount}
            />
          )}
          <ClaimsGlossary
            entries={glossaryEntries}
            onJump={onJumpToClaim}
            storageKey={claimsIndexStorageKey}
            className={cn(artifactPremiumCard, "border-border/50 bg-card/80 p-3")}
          />
          {claimsList}
        </div>
      ) : (
        <div className="space-y-5">
          <ArtifactInsightCarousel
            claims={claims}
            activeClaimId={activeClaimId ?? mobileOpenClaimId}
            onSelectClaim={handleCarouselSelect}
            variant="mobile"
          />
          {(showFollowControl || showPlaybackControl) && (
            <ClaimsPlaybackToolbar
              isPlaying={isPlaying}
              onTogglePlayback={onTogglePlayback}
              showPlaybackControl={showPlaybackControl}
              followPlayback={followPlayback}
              onToggleFollowPlayback={() => {
                setFollowPlayback((v) => {
                  const next = !v;
                  if (next) prevActiveClaimIdRef.current = null;
                  return next;
                });
              }}
              showFollowControl={showFollowControl}
              timedClaimsCount={timedClaimsCount}
            />
          )}
          <ClaimsGlossary
            entries={glossaryEntries}
            onJump={onJumpToClaim}
            compact
            defaultOpen={false}
            storageKey={claimsIndexStorageKey ? `${claimsIndexStorageKey}:index` : undefined}
            className={cn(artifactPremiumCard, "border-border/50 bg-card/80 p-2")}
          />
          {claimsList}
        </div>
      )}
    </div>
  );
}
