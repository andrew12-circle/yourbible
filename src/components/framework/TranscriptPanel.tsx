import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Bookmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import TranscriptSegmentBookmarkSheet, {
  type TranscriptSegmentBookmarkActions,
} from "@/components/framework/artifact-detail/TranscriptSegmentBookmarkSheet";
import TranscriptPanelFooter from "@/components/framework/artifact-detail/TranscriptPanelFooter";
import TranscriptToolbar from "@/components/framework/artifact-detail/TranscriptToolbar";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { artifactCard, artifactDesktopTranscriptPanel, artifactInset } from "@/lib/framework/artifactSurfaces";
import {
  isTranscriptRowInFollowViewport,
  readMobileTranscriptFollowInsets,
  scrollTranscriptRowIntoFollowViewport,
} from "@/lib/framework/transcriptFollowScroll";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SemanticHit = {
  start_seconds: number;
  end_seconds: number | null;
  text: string;
  similarity: number;
};

function findActiveSegmentId(segments: TranscriptSegment[], seconds: number): string | null {
  let best: TranscriptSegment | null = null;
  for (const s of segments) {
    if (s.isParagraphBreak || s.startSeconds == null) continue;
    if (s.startSeconds <= seconds && (!best || s.startSeconds > best.startSeconds!)) best = s;
  }
  return best?.id ?? null;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={key++} className="rounded-sm bg-amber-200/90 px-0.5 text-foreground dark:bg-amber-500/35">
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Active line — mobile transcript tab and desktop study rail (shared). */
const activeTranscriptRowClass =
  "z-10 mx-2 my-1 scale-[1.015] rounded-2xl border border-blue-200/80 bg-gradient-to-br from-sky-50 via-blue-50 to-white font-semibold shadow-[0_14px_34px_-18px_rgba(37,99,235,0.65)] ring-1 ring-blue-300/30";

export interface TranscriptPanelProps {
  artifactId?: string;
  segments: TranscriptSegment[];
  timed: boolean;
  coarseTimestampsOnly: boolean;
  embedAvailable: boolean;
  playerReady: boolean;
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
  getPlaybackSeconds: () => number;
  onSeek: (seconds: number) => void;
  canBookmark?: boolean;
  bookmarking?: boolean;
  onBookmarkSegment?: (seconds: number, snippet: string) => void;
  onCopy: () => void;
  onJournal: () => void;
  fullPageJournalLabel?: string;
  onRetryFetch?: () => void;
  retryDisabled?: boolean;
  setSegmentRef?: (id: string, el: HTMLDivElement | null) => void;
  showFormatButton?: boolean;
  formattingTranscript?: boolean;
  onFormatTranscript?: () => void;
  /** Flush layout when embedded directly under mobile video tabs. */
  embeddedInMobileTab?: boolean;
  /** Mobile YouTube transcript tab: full-height sheet layout and per-line bookmark menu. */
  variant?: "default" | "youtubeMobile" | "desktopStudy";
  setPlaybackRate?: (rate: number) => void;
  getIsPlaying?: () => boolean;
  onPauseVideo?: () => void;
  onResumePlayback?: () => void;
  segmentBookmarkActions?: {
    onSaveBookmark: (seconds: number, snippet: string) => void;
    onJournal: (seconds: number, snippet: string) => void;
    onResearchLater: (seconds: number, snippet: string) => void;
  };
  /** Mobile segment note dialog (youtubeMobile). */
  noteBody?: string;
  onNoteBodyChange?: (value: string) => void;
  notePolishResetKey?: string;
  onSaveSegmentNote?: (seconds: number) => void | Promise<void>;
  /** Pinned mobile video: scroll title away in the page scroller (not an inner transcript pane). */
  outerScrollContainerRef?: RefObject<HTMLElement | null>;
  /** Mobile: false while Study tab scrolls the shared pane (do not turn off transcript follow). */
  transcriptTabActive?: boolean;
}

export default function TranscriptPanel({
  artifactId,
  segments,
  timed,
  coarseTimestampsOnly,
  embedAvailable,
  playerReady,
  isPlaying = false,
  onTogglePlayback,
  getPlaybackSeconds,
  onSeek,
  canBookmark,
  bookmarking,
  onBookmarkSegment,
  onCopy,
  onJournal,
  fullPageJournalLabel = "Journal this",
  onRetryFetch,
  retryDisabled,
  setSegmentRef,
  showFormatButton,
  formattingTranscript,
  onFormatTranscript,
  embeddedInMobileTab = false,
  variant = "default",
  getIsPlaying,
  onPauseVideo,
  onResumePlayback,
  segmentBookmarkActions,
  noteBody = "",
  onNoteBodyChange,
  notePolishResetKey,
  onSaveSegmentNote,
  outerScrollContainerRef,
  transcriptTabActive = true,
  setPlaybackRate,
}: TranscriptPanelProps) {
  const youtubeMobile = variant === "youtubeMobile";
  const desktopStudy = variant === "desktopStudy";
  const studyTranscript = youtubeMobile || desktopStudy;
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const useOuterScroll = youtubeMobile && Boolean(outerScrollContainerRef);
  const toolbarSubtitle = desktopStudy
    ? "Tap a line to jump and follow along. Bookmark important moments."
    : canBookmark && onBookmarkSegment
      ? "Tap a line to jump and follow along. Bookmark a line to save that moment while you watch."
      : "Click a line to jump. Timestamps marked ~ are approximate.";
  const [search, setSearch] = useState("");
  const [semanticHits, setSemanticHits] = useState<SemanticHit[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [playbackTick, setPlaybackTick] = useState(0);
  const [followPlayback, setFollowPlayback] = useState(true);
  const innerScrollRef = useRef<HTMLDivElement | null>(null);
  const prevActiveSegmentIdRef = useRef<string | null>(null);
  const lastObservedTimeRef = useRef(-1);
  const lastTimeAdvanceAtRef = useRef(0);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const userPausedFollowUntilRef = useRef(0);
  const wasPlayingBeforeMenuRef = useRef(false);
  const [bookmarkMenuSegment, setBookmarkMenuSegment] = useState<{
    seconds: number;
    snippet: string;
    stamp: string | null;
    estimated?: boolean;
  } | null>(null);
  const [segmentNoteOpen, setSegmentNoteOpen] = useState(false);
  const [segmentNoteSeconds, setSegmentNoteSeconds] = useState<number | null>(null);

  const resumePlaybackIfNeeded = useCallback(() => {
    if (wasPlayingBeforeMenuRef.current) {
      onResumePlayback?.();
    }
    wasPlayingBeforeMenuRef.current = false;
  }, [onResumePlayback]);

  const pauseForOverlay = useCallback(() => {
    wasPlayingBeforeMenuRef.current = getIsPlaying?.() ?? isPlaying;
    onPauseVideo?.();
  }, [getIsPlaying, isPlaying, onPauseVideo]);

  const openBookmarkMenu = useCallback(
    (seconds: number, snippet: string, stamp: string | null, estimated?: boolean) => {
      pauseForOverlay();
      setBookmarkMenuSegment({ seconds, snippet, stamp, estimated });
    },
    [pauseForOverlay],
  );

  const closeBookmarkMenu = useCallback(
    (resume: boolean) => {
      setBookmarkMenuSegment(null);
      if (resume) resumePlaybackIfNeeded();
    },
    [resumePlaybackIfNeeded],
  );

  useEffect(() => {
    const q = search.trim();
    if (!artifactId || q.length < 3) {
      setSemanticHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSemanticLoading(true);
      void supabase.functions
        .invoke("framework-search-transcript", { body: { artifact_id: artifactId, query: q, limit: 12 } })
        .then(({ data, error }) => {
          if (error || !data?.semantic) {
            setSemanticHits([]);
            return;
          }
          setSemanticHits((data.hits as SemanticHit[]) ?? []);
        })
        .finally(() => setSemanticLoading(false));
    }, 400);
    return () => window.clearTimeout(t);
  }, [artifactId, search]);

  const displaySegments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return segments;
    const textHits = segments.filter((s) => !s.isParagraphBreak && s.text.toLowerCase().includes(q));
    if (!semanticHits.length || !timed) return textHits;
    const semanticWindows = semanticHits.map((h) => ({
      start: h.start_seconds,
      end: h.end_seconds ?? h.start_seconds + 120,
    }));
    const boosted = segments.filter((s) => {
      if (s.isParagraphBreak || s.startSeconds == null) return false;
      if (s.text.toLowerCase().includes(q)) return true;
      return semanticWindows.some((w) => s.startSeconds! >= w.start - 5 && s.startSeconds! <= w.end + 5);
    });
    const seen = new Set<string>();
    return [...textHits, ...boosted].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [segments, search, semanticHits, timed]);

  useEffect(() => {
    if (!playerReady) return;
    const ms = followPlayback ? 250 : 500;
    const id = window.setInterval(() => setPlaybackTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [playerReady, followPlayback]);

  useEffect(() => {
    const t = getPlaybackSeconds();
    if (t > lastObservedTimeRef.current + 0.25) {
      lastTimeAdvanceAtRef.current = Date.now();
    }
    lastObservedTimeRef.current = t;
  }, [playbackTick, getPlaybackSeconds]);

  const defaultedFollowOnReadyRef = useRef(false);
  useEffect(() => {
    if (!playerReady || defaultedFollowOnReadyRef.current) return;
    defaultedFollowOnReadyRef.current = true;
    setFollowPlayback(true);
  }, [playerReady]);

  const activeSegmentId = findActiveSegmentId(segments, getPlaybackSeconds());

  const searchActive = Boolean(search.trim());
  const highlightActive = activeSegmentId && (!searchActive || displaySegments.some((s) => s.id === activeSegmentId));

  const bindRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      setSegmentRef?.(id, el);
    },
    [setSegmentRef],
  );

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

  const playbackMoving =
    (getIsPlaying?.() ?? isPlaying) || Date.now() - lastTimeAdvanceAtRef.current < 1200;

  useEffect(() => {
    if (!transcriptTabActive) return;
    prevActiveSegmentIdRef.current = null;
  }, [transcriptTabActive]);

  useEffect(() => {
    if (!transcriptTabActive) return;
    if (!playerReady || searchActive || !activeSegmentId || !highlightActive || !followPlayback) return;
    if (Date.now() < userPausedFollowUntilRef.current) return;
    if (!playbackMoving) return;

    const segmentChanged = prevActiveSegmentIdRef.current !== activeSegmentId;
    prevActiveSegmentIdRef.current = activeSegmentId;

    const container = useOuterScroll
      ? outerScrollContainerRef?.current ?? null
      : innerScrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-transcript-row="${activeSegmentId}"]`);
    if (!container || !el) return;

    const insets = useOuterScroll ? readMobileTranscriptFollowInsets(container) : { top: 0, bottom: 0 };
    if (!segmentChanged && isTranscriptRowInFollowViewport(container, el, insets)) return;

    markProgrammaticScroll();
    scrollTranscriptRowIntoFollowViewport(container, el, insets, "smooth");
  }, [
    playerReady,
    searchActive,
    activeSegmentId,
    highlightActive,
    followPlayback,
    playbackMoving,
    playbackTick,
    markProgrammaticScroll,
    useOuterScroll,
    outerScrollContainerRef,
    transcriptTabActive,
  ]);

  useEffect(() => {
    if (!searchActive) prevActiveSegmentIdRef.current = null;
  }, [searchActive]);

  useEffect(() => {
    const container = useOuterScroll
      ? outerScrollContainerRef?.current ?? null
      : innerScrollRef.current;
    if (!container) return;
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      if (useOuterScroll && !transcriptTabActive) return;
      setFollowPlayback(false);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [useOuterScroll, outerScrollContainerRef, transcriptTabActive]);

  const seekFromSegment = useCallback(
    (seconds: number) => {
      userPausedFollowUntilRef.current = 0;
      setFollowPlayback(true);
      prevActiveSegmentIdRef.current = null;
      markProgrammaticScroll();
      onSeek(seconds);
    },
    [markProgrammaticScroll, onSeek],
  );

  const menuActions: TranscriptSegmentBookmarkActions | null =
    bookmarkMenuSegment && segmentBookmarkActions
      ? {
          onMakeNote: () => {
            const { seconds } = bookmarkMenuSegment;
            closeBookmarkMenu(false);
            setSegmentNoteSeconds(seconds);
            setSegmentNoteOpen(true);
          },
          onSaveBookmark: () => {
            const { seconds, snippet } = bookmarkMenuSegment;
            closeBookmarkMenu(true);
            segmentBookmarkActions.onSaveBookmark(seconds, snippet);
          },
          onJournal: () => {
            const { seconds, snippet } = bookmarkMenuSegment;
            closeBookmarkMenu(true);
            segmentBookmarkActions.onJournal(seconds, snippet);
          },
          onResearchLater: () => {
            const { seconds, snippet } = bookmarkMenuSegment;
            closeBookmarkMenu(true);
            segmentBookmarkActions.onResearchLater(seconds, snippet);
          },
        }
      : null;

  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      setPlaybackRateState(rate);
      setPlaybackRate?.(rate);
    },
    [setPlaybackRate],
  );

  return (
    <section
      ref={panelRef}
      className={cn(
        youtubeMobile
          ? useOuterScroll
            ? "bg-background"
            : "flex min-h-0 flex-1 flex-col bg-background"
          : desktopStudy
            ? artifactDesktopTranscriptPanel
            : artifactCard,
        embeddedInMobileTab && !youtubeMobile && !desktopStudy
          ? "mb-0 rounded-none border-0 border-t border-border/50 p-3 shadow-none sm:p-4"
          : !youtubeMobile &&
              !desktopStudy &&
              "mb-5 p-3 sm:p-4 lg:mb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:p-4",
        desktopStudy && "mb-0 flex h-full min-h-0 flex-col overflow-hidden",
        transcriptExpanded &&
          desktopStudy &&
          "fixed inset-3 z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col shadow-2xl sm:inset-6",
        !embeddedInMobileTab && !youtubeMobile && !desktopStudy && "lg:flex lg:h-full lg:min-h-0 lg:flex-col",
        youtubeMobile && "p-0",
        embeddedInMobileTab && youtubeMobile && "border-t border-border/50",
      )}
    >
      {search.trim().length >= 3 && artifactId ? (
        <p className="mb-2 text-[11px] text-muted-foreground">
          {semanticLoading
            ? "Searching transcript memory…"
            : semanticHits.length
              ? `Semantic matches: ${semanticHits.length} · also matching text`
              : "Text search (semantic index still building)"}
        </p>
      ) : null}

      <div
        className={cn(
          youtubeMobile && "shrink-0 border-b border-border/50 bg-background px-3 pb-3 pt-2 sm:px-4",
          desktopStudy && "shrink-0 px-4 pb-3 pt-4",
        )}
      >
        <TranscriptToolbar
          search={search}
          onSearchChange={setSearch}
          onCopy={onCopy}
          onJournal={onJournal}
          fullPageJournalLabel={fullPageJournalLabel}
          showTimestamps={showTimestamps}
          onToggleTimestamps={() => setShowTimestamps((v) => !v)}
          followPlayback={followPlayback}
          onToggleFollowPlayback={() => {
            setFollowPlayback((v) => {
              const next = !v;
              if (next) prevActiveSegmentIdRef.current = null;
              return next;
            });
          }}
          isPlaying={isPlaying}
          onTogglePlayback={onTogglePlayback}
          showPlaybackControl={!youtubeMobile && timed && playerReady && embedAvailable}
          showFollowControl={timed && playerReady}
          showFormatButton={showFormatButton && !youtubeMobile}
          formattingTranscript={formattingTranscript}
          onFormatTranscript={onFormatTranscript}
          subtitle={youtubeMobile ? "Tap a line to jump. Bookmark any line while the video plays." : toolbarSubtitle}
          compact={youtubeMobile}
          hideTitle={youtubeMobile}
          hideSecondaryActions={youtubeMobile}
          layout={desktopStudy ? "desktopStudy" : "default"}
        />
      </div>

      {coarseTimestampsOnly && onRetryFetch && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-muted/20 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 leading-relaxed">
            We don&apos;t have per-second captions for this transcript. If the video has an official caption track, try
            fetching again.
          </p>
          <Button size="sm" variant="secondary" className="h-8 shrink-0" disabled={retryDisabled} onClick={onRetryFetch}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry fetch
          </Button>
        </div>
      )}

      <div
        ref={useOuterScroll ? undefined : innerScrollRef}
        className={cn(
          "overflow-x-hidden",
          youtubeMobile
            ? useOuterScroll
              ? "bg-background"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background"
            : cn(
                "lg:scrollbar-hover-thin lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
                desktopStudy ? "bg-background px-1" : artifactInset,
              ),
        )}
      >
        <div className={cn(studyTranscript ? "space-y-1 py-1" : "divide-y divide-border/40")}>
          {displaySegments.map((segment) => {
            if (segment.isParagraphBreak) {
              return <div key={segment.id} className="h-3 shrink-0" aria-hidden />;
            }

            const canSeek = embedAvailable && segment.startSeconds != null;
            const isActive = highlightActive && segment.id === activeSegmentId;
            const stamp =
              segment.startSeconds != null
                ? `${segment.timestampEstimated ? "~" : ""}${formatTranscriptClock(segment.startSeconds)}`
                : null;

            return (
              <div
                key={segment.id}
                ref={(el) => bindRef(segment.id, el)}
                data-transcript-row={segment.id}
                className={cn(
                  "group relative flex gap-2 px-3 py-3 transition-all duration-200 ease-out sm:gap-3",
                  canSeek &&
                    (studyTranscript
                      ? "cursor-pointer hover:bg-blue-50/45"
                      : "cursor-pointer hover:bg-muted/30"),
                  isActive &&
                    (studyTranscript ? activeTranscriptRowClass : "bg-primary/[0.07]"),
                  studyTranscript && !isActive && "border-b border-border/40",
                  segment.isContinuation && "border-l-2 border-muted-foreground/15 pl-3",
                )}
                role={canSeek ? "button" : undefined}
                tabIndex={canSeek ? 0 : undefined}
                onClick={() => {
                  if (canSeek) seekFromSegment(segment.startSeconds!);
                }}
                onKeyDown={(e) => {
                  if (!canSeek) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    seekFromSegment(segment.startSeconds!);
                  }
                }}
              >
                {isActive && !studyTranscript ? (
                  <span
                    className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
                {showTimestamps && (
                  <div className="flex w-[4.5rem] shrink-0 items-start gap-1 sm:w-[5.5rem]">
                    <span className="w-3 shrink-0" aria-hidden />
                    <div className="flex min-w-0 flex-1 justify-end">
                      {timed && stamp ? (
                        <span
                          className={cn(
                            "inline-flex min-h-[1.375rem] min-w-[3.25rem] max-w-full items-center justify-center text-[11px] font-medium tabular-nums leading-none text-muted-foreground",
                            !studyTranscript &&
                              "rounded-full border border-border/60 bg-background/80 px-2 py-1 text-center text-foreground/90",
                            studyTranscript &&
                              isActive &&
                              "rounded-full border border-blue-200/80 bg-white/85 px-2 py-1 text-center font-semibold text-blue-700 shadow-[0_4px_12px_-8px_rgba(37,99,235,0.8)]",
                            segment.timestampEstimated && "italic",
                          )}
                        >
                          {stamp}
                        </span>
                      ) : timed ? (
                        <span className="text-[10px] tabular-nums text-muted-foreground/50">—</span>
                      ) : (
                        <span className="max-w-[5rem] truncate text-[10px] font-medium tabular-nums text-muted-foreground/70">
                          {segment.label}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p
                  className={cn(
                    "min-w-0 flex-1 font-sans text-sm leading-relaxed",
                    isActive
                      ? studyTranscript
                        ? "font-semibold text-blue-950"
                        : "font-medium text-foreground"
                      : "text-foreground/90",
                    !showTimestamps && "pl-1",
                    canBookmark &&
                      segment.startSeconds != null &&
                      (studyTranscript ? "pr-10" : onBookmarkSegment && "pr-9 sm:pr-10"),
                  )}
                >
                  <HighlightedText text={segment.text} query={search} />
                </p>
                {canBookmark && segment.startSeconds != null && youtubeMobile && segmentBookmarkActions ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "absolute right-2 top-2 h-8 w-8 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-blue-100/70 hover:text-blue-700",
                      isActive && "bg-white/75 text-blue-700 shadow-sm hover:bg-white",
                    )}
                    disabled={bookmarking}
                    aria-label={`Bookmark at ${stamp ?? formatTranscriptClock(segment.startSeconds)}`}
                    title="Bookmark this line"
                    onClick={(e) => {
                      e.stopPropagation();
                      const snippet = segment.text.trim().slice(0, 120);
                      openBookmarkMenu(
                        segment.startSeconds!,
                        snippet,
                        stamp,
                        segment.timestampEstimated,
                      );
                    }}
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </Button>
                ) : canBookmark && onBookmarkSegment && segment.startSeconds != null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute right-1.5 top-2 h-8 w-8 shrink-0 text-muted-foreground",
                      desktopStudy
                        ? "rounded-full hover:bg-blue-100/70 hover:text-blue-700"
                        : "hover:text-foreground",
                      desktopStudy && isActive && "bg-white/75 text-blue-700 shadow-sm hover:bg-white",
                      !desktopStudy &&
                        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                      desktopStudy && "opacity-100",
                    )}
                    disabled={bookmarking}
                    aria-label={`Bookmark at ${stamp ?? formatTranscriptClock(segment.startSeconds)}`}
                    title="Bookmark this line"
                    onClick={(e) => {
                      e.stopPropagation();
                      const snippet = segment.text.trim().slice(0, 120);
                      onBookmarkSegment(segment.startSeconds!, snippet);
                    }}
                  >
                    <Bookmark className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {desktopStudy ? (
        <TranscriptPanelFooter
          followPlayback={followPlayback}
          onFollowPlaybackChange={(next) => {
            setFollowPlayback(next);
            if (next) prevActiveSegmentIdRef.current = null;
          }}
          playbackRate={playbackRate}
          onPlaybackRateChange={handlePlaybackRateChange}
          showPlaybackRate={embedAvailable && playerReady}
          expanded={transcriptExpanded}
          onToggleExpanded={() => setTranscriptExpanded((v) => !v)}
        />
      ) : null}

      {youtubeMobile && menuActions ? (
        <TranscriptSegmentBookmarkSheet
          open={Boolean(bookmarkMenuSegment)}
          onOpenChange={(open) => {
            if (!open) closeBookmarkMenu(true);
          }}
          stamp={
            bookmarkMenuSegment?.stamp ??
            (bookmarkMenuSegment
              ? `${bookmarkMenuSegment.estimated ? "~" : ""}${formatTranscriptClock(bookmarkMenuSegment.seconds)}`
              : null)
          }
          snippet={bookmarkMenuSegment?.snippet ?? ""}
          disabled={bookmarking}
          actions={menuActions}
        />
      ) : null}

      {youtubeMobile && onSaveSegmentNote && onNoteBodyChange ? (
        <Dialog
          open={segmentNoteOpen}
          onOpenChange={(open) => {
            setSegmentNoteOpen(open);
            if (!open) {
              setSegmentNoteSeconds(null);
              resumePlaybackIfNeeded();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {segmentNoteSeconds != null
                  ? `Note at ${formatTranscriptClock(segmentNoteSeconds)}`
                  : "Note at this line"}
              </DialogTitle>
              <DialogDescription>Saves a timestamped note for this moment in the video.</DialogDescription>
            </DialogHeader>
            <PolishedTextarea
              polishResetKey={notePolishResetKey}
              value={noteBody}
              onChange={(e) => onNoteBodyChange(e.target.value)}
              rows={4}
              placeholder="Add a note for this transcript line…"
              disabled={!canBookmark || bookmarking}
              className="w-full min-w-0"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSegmentNoteOpen(false);
                  setSegmentNoteSeconds(null);
                  resumePlaybackIfNeeded();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canBookmark || bookmarking || !noteBody.trim() || segmentNoteSeconds == null}
                onClick={() => {
                  if (segmentNoteSeconds == null) return;
                  void Promise.resolve(onSaveSegmentNote(segmentNoteSeconds)).then(() => {
                    setSegmentNoteOpen(false);
                    setSegmentNoteSeconds(null);
                    resumePlaybackIfNeeded();
                  });
                }}
              >
                {bookmarking ? "Saving…" : "Save note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
