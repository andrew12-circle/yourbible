import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import TranscriptToolbar from "@/components/framework/artifact-detail/TranscriptToolbar";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { artifactCard, artifactInset } from "@/lib/framework/artifactSurfaces";
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

export interface TranscriptPanelProps {
  artifactId?: string;
  segments: TranscriptSegment[];
  timed: boolean;
  coarseTimestampsOnly: boolean;
  embedAvailable: boolean;
  playerReady: boolean;
  isPlaying?: boolean;
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
  onStudyJournal?: () => void;
  showFormatButton?: boolean;
  formattingTranscript?: boolean;
  onFormatTranscript?: () => void;
}

export default function TranscriptPanel({
  artifactId,
  segments,
  timed,
  coarseTimestampsOnly,
  embedAvailable,
  playerReady,
  isPlaying = false,
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
  onStudyJournal,
  showFormatButton,
  formattingTranscript,
  onFormatTranscript,
}: TranscriptPanelProps) {
  const [search, setSearch] = useState("");
  const [semanticHits, setSemanticHits] = useState<SemanticHit[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [playbackTick, setPlaybackTick] = useState(0);
  const [followPlayback, setFollowPlayback] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevActiveSegmentIdRef = useRef<string | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);

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
    const id = window.setInterval(() => setPlaybackTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [playerReady]);

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

  useEffect(() => {
    if (!playerReady || searchActive || !activeSegmentId || !highlightActive || !followPlayback) return;
    if (!isPlaying) return;

    const segmentChanged = prevActiveSegmentIdRef.current !== activeSegmentId;
    prevActiveSegmentIdRef.current = activeSegmentId;

    const container = scrollContainerRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-transcript-row="${activeSegmentId}"]`);
    if (!container || !el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const edgeMargin = 56;
    const inView =
      elRect.top >= containerRect.top + edgeMargin &&
      elRect.bottom <= containerRect.bottom - edgeMargin;
    if (!segmentChanged && inView) return;

    markProgrammaticScroll();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [
    playerReady,
    searchActive,
    activeSegmentId,
    highlightActive,
    followPlayback,
    isPlaying,
    playbackTick,
    markProgrammaticScroll,
  ]);

  useEffect(() => {
    if (!searchActive) prevActiveSegmentIdRef.current = null;
  }, [searchActive]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      setFollowPlayback(false);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const seekFromSegment = useCallback(
    (seconds: number) => {
      setFollowPlayback(true);
      prevActiveSegmentIdRef.current = null;
      markProgrammaticScroll();
      onSeek(seconds);
    },
    [markProgrammaticScroll, onSeek],
  );

  return (
    <section
      className={cn(
        artifactCard,
        "mb-5 p-3 sm:p-4 lg:mb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:p-4",
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
        showFollowControl={timed && playerReady}
        onStudyJournal={onStudyJournal}
        showFormatButton={showFormatButton}
        formattingTranscript={formattingTranscript}
        onFormatTranscript={onFormatTranscript}
      />

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
        ref={scrollContainerRef}
        className={cn(
          "overflow-x-hidden lg:scrollbar-hover-thin lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
          artifactInset,
        )}
      >
        <div className="divide-y divide-border/40">
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
                  "group relative flex gap-2 px-3 py-3 transition-colors duration-150 sm:gap-3",
                  canSeek && "cursor-pointer hover:bg-muted/35",
                  isActive && "bg-primary/[0.07]",
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
                {isActive ? (
                  <span
                    className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
                {showTimestamps && (
                  <div className="flex w-[4.5rem] shrink-0 items-start justify-end sm:w-[5.25rem]">
                    {timed && stamp ? (
                      <span
                        className={cn(
                          "inline-flex min-h-[1.375rem] min-w-[3.5rem] max-w-full items-center justify-center rounded-full border border-border/60 bg-background/80 px-2 py-1 text-center text-[11px] font-medium tabular-nums leading-none text-foreground/90",
                          segment.timestampEstimated && "italic text-foreground/85",
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
                )}
                <p
                  className={cn(
                    "min-w-0 flex-1 font-sans text-sm leading-relaxed",
                    isActive ? "font-medium text-foreground" : "text-foreground/90",
                    !showTimestamps && "pl-1",
                    canBookmark && onBookmarkSegment && segment.startSeconds != null && "pr-9 sm:pr-10",
                  )}
                >
                  <HighlightedText text={segment.text} query={search} />
                </p>
                {canBookmark && onBookmarkSegment && segment.startSeconds != null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute right-1.5 top-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
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
    </section>
  );
}
