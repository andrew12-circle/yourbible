import { cn } from "@/lib/utils";
import type { ActiveInlineMarker } from "@/lib/journal/inlineMarkers";
import type { JournalMarkerSuggestion } from "@/hooks/useJournalBodyMarkers";

export function JournalMarkerMenu({
  marker,
  suggestions,
  activeIndex,
  onPick,
  onHover,
  className,
}: {
  marker: ActiveInlineMarker | null;
  suggestions: JournalMarkerSuggestion[];
  activeIndex: number;
  onPick: (suggestion: JournalMarkerSuggestion) => void;
  onHover: (index: number) => void;
  className?: string;
}) {
  if (!marker || suggestions.length === 0) return null;

  const heading = marker.kind === "journal" ? "Journals & sections" : "Tags";

  return (
    <div
      role="listbox"
      aria-label={heading}
      className={cn(
        "z-20 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-lg",
        className,
      )}
    >
      <div className="border-b border-border/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </div>
      <ul className="max-h-48 overflow-y-auto py-1">
        {suggestions.map((s, i) => (
          <li key={`${s.kind}-${s.id}`}>
            <button
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition",
                i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
              }}
              onMouseEnter={() => onHover(i)}
            >
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{s.kind === "journal" ? "@" : "#"}</span>
                <span className="truncate font-medium">{s.label}</span>
              </span>
              {s.hint ? (
                <span className="pl-5 text-[11px] leading-snug text-muted-foreground">{s.hint}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
