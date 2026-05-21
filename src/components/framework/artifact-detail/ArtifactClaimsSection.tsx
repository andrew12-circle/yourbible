import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import ArtifactMobileClaimShell from "@/components/framework/artifact-detail/ArtifactMobileClaimShell";
import ClaimsGlossary, { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import ClaimsPlaybackToolbar from "@/components/framework/artifact-detail/ClaimsPlaybackToolbar";
import { useIsDesktop } from "@/hooks/use-desktop";
import { findActiveClaimId } from "@/lib/framework/claimPlaybackSync";
import {
  artifactCard,
  artifactScrollMtMobile,
  artifactScrollMtMobilePane,
} from "@/lib/framework/artifactSurfaces";
import type { ClaimChapterGroup } from "@/lib/framework/groupClaimsUnderYoutubeChapters";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

type ClaimLike = { id: string; claim: string; verdict: string | null };

type Props<T extends ClaimLike> = {
  claims: T[];
  claimChapterLayout: { grouped: boolean; groups: ClaimChapterGroup<T>[] };
  glossaryEntries: ClaimsGlossaryEntry[];
  youTubeVideoId: string | null;
  onJumpToClaim: (claimId: string) => void;
  onSeekChapter: (seconds: number) => void;
  renderClaimCard: (claim: T, claimIndex: number) => React.ReactNode;
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
};

export default function ArtifactClaimsSection<T extends ClaimLike>({
  claims,
  claimChapterLayout,
  glossaryEntries,
  youTubeVideoId,
  onJumpToClaim,
  onSeekChapter,
  renderClaimCard,
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

  const seekForClaim = useCallback(
    (claim: T) => (getClaimSeekSeconds ? getClaimSeekSeconds(claim) : null),
    [getClaimSeekSeconds],
  );

  const activeClaimId = useMemo(() => {
    if (!showFollowControl || !getPlaybackSeconds) return null;
    void playbackTick;
    return findActiveClaimId(claims, seekForClaim, getPlaybackSeconds());
  }, [showFollowControl, getPlaybackSeconds, claims, seekForClaim, playbackTick]);

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
      ? rect.top >= bounds.top + edgeMargin && rect.bottom <= bounds.bottom - edgeMargin
      : rect.top >= edgeMargin && rect.bottom <= window.innerHeight - edgeMargin;
    if (!claimChanged && inView) return;

    markProgrammaticScroll();
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  return (
    <div
      id="claims"
      className={cn(
        "max-w-4xl",
        isDesktop ? "scroll-mt-24" : pinnedVideoPane ? artifactScrollMtMobilePane : artifactScrollMtMobile,
      )}
    >
      <div
        className={cn(
          artifactCard,
          "border border-amber-200/70 bg-amber-50/55 p-3 dark:border-amber-900/50 dark:bg-amber-950/25 sm:p-4",
          isDesktop ? "space-y-5" : "space-y-4",
        )}
      >
        <ClaimsGlossary
          entries={glossaryEntries}
          onJump={onJumpToClaim}
          compact={!isDesktop}
          storageKey={claimsIndexStorageKey}
          className={cn(
            "border-amber-200/60 bg-background/60 dark:border-amber-900/40 dark:bg-background/30",
            isDesktop ? "mb-0" : "mb-0",
          )}
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
        <div className={isDesktop ? "space-y-8" : "space-y-5"}>
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
                  {group.claims.map((c) =>
                    wrapCard(c, Math.max(0, claims.findIndex((x) => x.id === c.id))),
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={isDesktop ? "space-y-5" : "space-y-3"}>{claims.map((c, i) => wrapCard(c, i))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
