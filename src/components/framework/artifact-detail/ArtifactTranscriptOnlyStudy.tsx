import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranscriptOnlyStudy } from "@/hooks/useTranscriptOnlyStudy";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import type { LocalExcerpt } from "@/lib/framework/transcriptOnlyStudy";

type Props = {
  artifactId: string;
  text: string;
  initiallyOpen?: boolean;
  onSeek?: (seconds: number) => void;
  className?: string;
};

export default function ArtifactTranscriptOnlyStudy({ artifactId, text, initiallyOpen = true, onSeek, className }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const previousAutoOpen = useRef(initiallyOpen);
  useEffect(() => {
    if (initiallyOpen && !previousAutoOpen.current) setOpen(true);
    previousAutoOpen.current = initiallyOpen;
  }, [initiallyOpen]);
  const { result, error, pending, retry } = useTranscriptOnlyStudy(artifactId, text, open);
  const [copyResult, setCopyResult] = useState<{ source: string; message: string } | null>(null);
  const currentSource = useRef(text);
  currentSource.current = text;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const panelId = useId();
  const copy = async (excerpt: LocalExcerpt) => {
    const source = text;
    try {
      await navigator.clipboard.writeText(excerpt.quote);
      if (alive.current && currentSource.current === source) setCopyResult({ source, message: "Excerpt copied." });
    } catch {
      if (alive.current && currentSource.current === source) setCopyResult({ source, message: "Could not copy. You can select and copy the excerpt text below." });
    }
  };
  return (
    <section className={`mb-4 rounded-xl border border-border/60 bg-card p-4 ${className ?? ""}`}
      aria-label="Transcript-only study" data-testid="artifact-transcript-only-study">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Transcript-only study</h3>
          <p className="text-xs text-muted-foreground">Runs on this device. No AI credits required.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
          {open ? "Hide excerpts" : "Show excerpts"}
          {open ? <ChevronUp className="ml-1 h-4 w-4" aria-hidden /> : <ChevronDown className="ml-1 h-4 w-4" aria-hidden />}
        </Button>
      </div>
      {open ? <div id={panelId} className="mt-3 space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Suggested excerpts are copied from your saved transcript, with line breaks joined. Selection uses repeated words,
          written Scripture references, and position in the source. These are not AI findings, verified teachings, or a complete summary.
          Your saved findings and research are unchanged.
        </p>
        {pending ? <p role="status" className="text-sm text-muted-foreground">Selecting excerpts on this device…</p> : null}
        {error ? <div role="status" className="text-sm">
          <p>{error}</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={retry}>
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden />Retry local scan</Button>
        </div> : null}
        {result?.status === "too_large" ? <p role="status" className="text-sm text-muted-foreground">
          This source exceeds the one-million-character local scan limit. Nothing was silently truncated. Reading, search, and notes remain available.
        </p> : null}
        {result?.status === "ready" ? <>
          <p className="text-xs text-muted-foreground">{result.scannedSegments.toLocaleString()} nonempty transcript segments scanned · {result.excerpts.length} suggested excerpts</p>
          {result.references.length ? <div className="rounded-lg bg-muted/40 p-3">
            <h4 className="text-sm font-medium">References written in the transcript</h4>
            <p className="mt-1 text-sm">{result.references.join(" · ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Mentions only, not proof of a teaching or verification of verse wording.
              {result.referenceCount > result.references.length ? ` Showing ${result.references.length} of ${result.referenceCount} distinct written references.` : ""}</p>
          </div> : null}
          {!result.excerpts.length ? <p className="text-sm text-muted-foreground">
            There is not enough substantive text for useful excerpt suggestions. The saved transcript is still available to read and annotate.
          </p> : <div className="space-y-3">{result.excerpts.map((excerpt, index) => <article key={excerpt.id} className="rounded-lg border border-border/50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{excerpt.region} · Excerpt {index + 1}</p>
              <div className="flex items-center gap-1">
                {excerpt.startSeconds != null && onSeek ? <Button type="button" size="sm" variant="ghost"
                  onClick={() => onSeek(excerpt.startSeconds!)} aria-label={`Play ${excerpt.approximate ? "near " : "from "}${formatTranscriptClock(excerpt.startSeconds)}`}>
                  <Play className="mr-1 h-3.5 w-3.5" aria-hidden />{excerpt.approximate ? "Approx. " : ""}{formatTranscriptClock(excerpt.startSeconds)}
                </Button> : <span className="text-xs text-muted-foreground">{excerpt.startSeconds == null ? "No timestamp" : `${excerpt.approximate ? "Approx. " : ""}${formatTranscriptClock(excerpt.startSeconds)}`}</span>}
                <Button type="button" size="sm" variant="ghost" onClick={() => void copy(excerpt)} aria-label={`Copy excerpt ${index + 1}`}>
                  <Copy className="h-3.5 w-3.5" aria-hidden /><span className="sr-only">Copy</span>
                </Button>
              </div>
            </div>
            <blockquote className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{excerpt.quote}</blockquote>
            <p className="mt-2 text-xs text-muted-foreground">{excerpt.reason} Read the surrounding transcript for context.</p>
          </article>)}</div>}
        </> : null}
        {copyResult?.source === text ? <p role="status" className="text-xs text-muted-foreground">{copyResult.message}</p> : null}
      </div> : null}
    </section>
  );
}
