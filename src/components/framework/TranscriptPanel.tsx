import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

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
  const parts: ReactNode[] = [];
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
  segments: TranscriptSegment[];
  timed: boolean;
  coarseTimestampsOnly: boolean;
  embedAvailable: boolean;
  playerReady: boolean;
  getPlaybackSeconds: () => number;
  onSeek: (seconds: number) => void;
  onCopy: () => void;
  onJournal: () => void;
  onRetryFetch?: () => void;
  retryDisabled?: boolean;
  setSegmentRef?: (id: string, el: HTMLDivElement | null) => void;
  /** e.g. “Journal here” floating panel trigger */
  extraHeaderActions?: ReactNode;
}

export default function TranscriptPanel({
  segments,
  timed,
  coarseTimestampsOnly,
  embedAvailable,
  playerReady,
  getPlaybackSeconds,
  onSeek,
  onCopy,
  onJournal,
  onRetryFetch,
  retryDisabled,
  setSegmentRef,
  extraHeaderActions,
}: TranscriptPanelProps) {
  const [search, setSearch] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [playbackTick, setPlaybackTick] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastAutoScrolledId = useRef<string | null>(null);

  const displaySegments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return segments;
    return segments.filter((s) => !s.isParagraphBreak && s.text.toLowerCase().includes(q));
  }, [segments, search]);

  useEffect(() => {
    if (!playerReady) return;
    const id = window.setInterval(() => setPlaybackTick((n) => n + 1), 300);
    return () => window.clearInterval(id);
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

  useEffect(() => {
    if (!playerReady || searchActive || !activeSegmentId || !highlightActive) return;
    if (lastAutoScrolledId.current === activeSegmentId) return;
    lastAutoScrolledId.current = activeSegmentId;
    const el = scrollContainerRef.current?.querySelector<HTMLElement>(`[data-transcript-row="${activeSegmentId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [playerReady, searchActive, activeSegmentId, highlightActive]);

  useEffect(() => {
    if (!searchActive) lastAutoScrolledId.current = null;
  }, [searchActive]);

  return (
    <section className="mb-5 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Working transcript</h2>
          <p className="text-xs text-muted-foreground">
            {timed
              ? "Click a line to jump in the player. Timestamps marked ~ are spread across the clip and are approximate."
              : "Readable sections. Claim cards below can jump to the closest matching section."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copy
          </Button>
          <Button size="sm" onClick={onJournal}>
            Journal this
          </Button>
          {extraHeaderActions}
        </div>
      </div>

      {coarseTimestampsOnly && onRetryFetch && (
        <div className="mb-3 flex flex-col gap-2 rounded-md border border-border/80 bg-muted/25 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 leading-relaxed">
            We don&apos;t have per-second captions for this transcript. If the video has an official caption track, try
            fetching again.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shrink-0"
            disabled={retryDisabled}
            onClick={onRetryFetch}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry fetch
          </Button>
        </div>
      )}

      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript…"
          className="h-9 font-sans text-sm sm:max-w-xs"
          aria-label="Search transcript"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full px-3 text-xs font-medium"
          onClick={() => setShowTimestamps((v) => !v)}
        >
          {showTimestamps ? "Hide timestamps" : "Show timestamps"}
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-md border border-border/60 bg-muted/15"
      >
        <div className="divide-y divide-border/50">
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
                  "group flex gap-2 px-2 py-2.5 transition-colors sm:gap-3 sm:px-3",
                  canSeek && "cursor-pointer hover:bg-muted/45",
                  isActive && "bg-primary/8 ring-1 ring-inset ring-primary/20",
                  segment.isContinuation && "pl-2 border-l-2 border-muted-foreground/20 sm:pl-3",
                )}
                role={canSeek ? "button" : undefined}
                tabIndex={canSeek ? 0 : undefined}
                onClick={() => {
                  if (canSeek) onSeek(segment.startSeconds!);
                }}
                onKeyDown={(e) => {
                  if (!canSeek) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSeek(segment.startSeconds!);
                  }
                }}
              >
                {showTimestamps && (
                  <div className="flex w-[4.5rem] shrink-0 justify-end pt-0.5 sm:w-[5.25rem]">
                    {timed && stamp ? (
                      <span
                        className={cn(
                          "inline-flex min-w-[3.25rem] justify-end rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground",
                          segment.timestampEstimated && "italic text-muted-foreground/90",
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
                    "min-w-0 flex-1 font-sans text-sm leading-relaxed text-foreground",
                    !showTimestamps && "pl-1",
                  )}
                >
                  <HighlightedText text={segment.text} query={search} />
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
