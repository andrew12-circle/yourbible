import { Check } from "lucide-react";
import { coverLeatherStyle, type Cover } from "@/lib/bible/palettes";
import { cn } from "@/lib/utils";

interface LeatherCoverCardProps {
  cover: Cover;
  selected: boolean;
  onClick: () => void;
  /** Full card with tagline (onboarding) vs compact label (settings) */
  layout?: "full" | "compact";
  className?: string;
}

export function LeatherCoverCard({
  cover,
  selected,
  onClick,
  layout = "full",
  className,
}: LeatherCoverCardProps) {
  const isLight = cover.tone === "light";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${cover.label} cover${selected ? ", selected" : ""}`}
      data-cover={cover.id}
      style={coverLeatherStyle(cover.leather)}
      className={cn(
        "leather-cover-card leather-cover-surface group relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all",
        `leather-cover--${cover.variant}`,
        cover.variant === "obsidian" && "leather-cover--foil-gold",
        selected
          ? "border-gold shadow-gold scale-[1.02] ring-1 ring-gold/40"
          : "border-paper-edge hover:border-leather/25 hover:shadow-soft",
        className,
      )}
    >
      <span className="leather-cover-stitch" aria-hidden />
      <span className="leather-cover-frame" aria-hidden />

      {layout === "full" ? (
        <div className="absolute inset-0 flex items-end p-4">
          <div
            className={cn(
              "text-left relative z-[1]",
              isLight ? "text-leather-deep" : "text-gold-bright",
            )}
          >
            <div className="font-display text-lg drop-shadow-sm">{cover.label}</div>
            <div className={cn("text-xs", isLight ? "text-leather/80" : "text-white/75")}>
              {cover.tagline}
            </div>
          </div>
          {!isLight && (
            <span
              className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent pointer-events-none"
              aria-hidden
            />
          )}
        </div>
      ) : (
        <span
          className={cn(
            "absolute bottom-1.5 left-2 z-[1] text-[10px] font-display drop-shadow-sm",
            isLight ? "text-leather-deep" : "text-gold-bright",
          )}
        >
          {cover.label}
        </span>
      )}

      {selected && (
        <span
          className={cn(
            "absolute z-[2] rounded-full bg-gold flex items-center justify-center shadow-md ring-2 ring-white/20",
            layout === "compact" ? "top-1.5 right-1.5 w-5 h-5" : "top-3 right-3 w-7 h-7",
          )}
        >
          <Check
            className={cn("text-leather-deep", layout === "compact" ? "w-3 h-3" : "w-4 h-4")}
            strokeWidth={3}
          />
        </span>
      )}
    </button>
  );
}
