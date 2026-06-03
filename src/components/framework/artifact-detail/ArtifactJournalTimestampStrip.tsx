import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { JournalTimestampMarker } from "@/lib/journal/artifactJournalTimestamps";
import { artifactMobileJournalEdgePad } from "@/lib/framework/artifactLayoutCss";
import { cn } from "@/lib/utils";

type Props = {
  markers: JournalTimestampMarker[];
  onSeek: (seconds: number) => void;
  onInsert?: () => void;
  showInsert?: boolean;
  className?: string;
  /** Compact row on ruled notebook (handwritten). */
  variant?: "default" | "notebook";
};

export default function ArtifactJournalTimestampStrip({
  markers,
  onSeek,
  onInsert,
  showInsert = false,
  className,
  variant = "default",
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const notebook = variant === "notebook";

  if (!showInsert && markers.length === 0) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-1.5",
        notebook
          ? cn("border-b border-red-200/80 bg-white/95 py-2", artifactMobileJournalEdgePad)
          : "mb-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showInsert && onInsert ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-8 shrink-0 border-border bg-background text-foreground shadow-none hover:bg-muted/80",
              notebook && "h-7 text-xs",
            )}
            onClick={onInsert}
          >
            <Clock className="mr-1 h-3.5 w-3.5" />
            Timestamp
          </Button>
        ) : null}
        {markers.length > 0 ? (
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
              notebook && "text-muted-foreground/80",
            )}
          >
            {markers.length === 1 ? "1 mark" : `${markers.length} marks`}
          </span>
        ) : null}
      </div>
      {markers.length > 0 ? (
        <ul className={cn("flex flex-col gap-1", notebook && "max-h-[min(28vh,200px)] overflow-y-auto")}>
          {markers.map((marker) => {
            const lines = marker.transcriptLines;
            const firstLine = lines[0] ?? "";
            const restLines = lines.slice(1);
            const hasTranscript = lines.length > 0;
            const hasMoreTranscript = restLines.length > 0;
            const isOpen = openId === marker.id;
            return (
              <li key={marker.id}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setOpenId(open ? marker.id : null)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-lg border border-border/50 bg-background/90",
                      notebook ? "text-[12px] shadow-sm" : "text-sm",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "shrink-0 px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-primary hover:bg-muted/60",
                        notebook && "py-1",
                      )}
                      onClick={() => onSeek(marker.seconds)}
                      title="Jump to this moment in the video"
                    >
                      {marker.clock}
                    </button>
                    {hasTranscript ? (
                      <p
                        className={cn(
                          "min-w-0 flex-1 truncate py-1.5 pr-1 text-[11px] leading-snug text-muted-foreground",
                          notebook && "py-1",
                        )}
                      >
                        {firstLine}
                      </p>
                    ) : (
                      <div className="min-w-0 flex-1" />
                    )}
                    {hasMoreTranscript ? (
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="grid h-8 w-8 shrink-0 place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          aria-label={isOpen ? "Hide transcript" : "Show more transcript"}
                        >
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                            aria-hidden
                          />
                        </button>
                      </CollapsibleTrigger>
                    ) : null}
                  </div>
                  {hasMoreTranscript ? (
                    <CollapsibleContent>
                      <div
                        className={cn(
                          "mt-1 space-y-1 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground",
                          notebook && "bg-sky-50/40",
                        )}
                      >
                        {restLines.map((line, i) => (
                          <p key={`${marker.id}-rest-${i}`}>{line}</p>
                        ))}
                      </div>
                    </CollapsibleContent>
                  ) : null}
                </Collapsible>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
