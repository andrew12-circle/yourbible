import { FONT_CHOICES, type FontChoiceId } from "@/lib/bible/fontChoices";
import { cn } from "@/lib/utils";

interface Props {
  value: string | undefined;
  onChange: (id: FontChoiceId) => void;
  /** Compact pills for toolbar menus; grid for settings sheets. */
  layout?: "row" | "grid";
  className?: string;
}

export function ReaderFontPicker({ value, onChange, layout = "row", className }: Props) {
  const current = value ?? "serif";

  return (
    <div
      className={cn(
        layout === "grid"
          ? "grid grid-cols-3 gap-2"
          : "flex gap-1 rounded-full border border-white/50 bg-white/30 p-1 backdrop-blur-md",
        className,
      )}
      role="radiogroup"
      aria-label="Scripture font"
    >
      {FONT_CHOICES.map((f) => {
        const selected = current === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => onChange(f.id)}
            className={cn(
              "transition-all",
              layout === "grid"
                ? cn(
                    "rounded-xl border-2 p-3 text-center bg-white/40",
                    selected ? "border-zinc-400 shadow-sm" : "border-white/40 hover:border-zinc-300",
                  )
                : cn(
                    "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium",
                    selected
                      ? "bg-white/80 text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:bg-white/50 hover:text-zinc-800",
                  ),
            )}
          >
            <span className={cn(layout === "grid" && f.previewClass, layout === "grid" && "block text-base")}>
              {layout === "grid" ? "Aa" : f.label}
            </span>
            {layout === "grid" ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">{f.label}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{f.sample}</div>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
