import { cn } from "@/lib/utils";
import type { ActiveInlineMarker } from "@/lib/journal/inlineMarkers";

type Suggestion = { id: string; label: string; kind: "journal" | "hashtag" };

export function JournalMarkerMenu({
  marker,
  suggestions,
  activeIndex,
  onPick,
  onHover,
  className,
}: {
  marker: ActiveInlineMarker | null;
  suggestions: Suggestion[];
  activeIndex: number;
  onPick: (label: string) => void;
  onHover: (index: number) => void;
  className?: string;
}) {
  if (!marker || suggestions.length === 0) return null;

  const heading = marker.kind === "journal" ? "Journals" : "Tags";

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
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s.label);
              }}
              onMouseEnter={() => onHover(i)}
            >
              <span className="text-muted-foreground">{s.kind === "journal" ? "@" : "#"}</span>
              <span className="truncate">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
