import { PenLine, Trash2 } from "lucide-react";
import { getPalette } from "@/lib/bible/palettes";

type Props = {
  paletteId: string;
  currentColor?: string | null;
  activeColor?: string | null;
  currentlyUnderlined?: boolean;
  onPickHighlight: (cssVar: string) => void;
  onActiveColorChange?: (cssVar: string) => void;
  onPickUnderline: () => void;
  onClear: () => void;
};

/** Highlight colors and mark tools — embedded in the spread study page. */
export function ReaderSpreadMarkTools({
  paletteId,
  currentColor,
  activeColor,
  currentlyUnderlined,
  onPickHighlight,
  onActiveColorChange,
  onPickUnderline,
  onClear,
}: Props) {
  const palette = getPalette(paletteId);
  const showClear = Boolean(currentColor || currentlyUnderlined);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {palette.colors.map((c) => (
        <button
          key={c.cssVar}
          type="button"
          onClick={() => {
            onPickHighlight(c.cssVar);
            onActiveColorChange?.(c.cssVar);
          }}
          title={`${c.name}${c.meaning ? ` · ${c.meaning}` : ""}`}
          className={`h-7 w-7 rounded-full border-2 transition-all ${
            (activeColor ?? currentColor) === c.cssVar && !currentlyUnderlined
              ? "scale-110 border-leather"
              : "border-paper hover:scale-105"
          }`}
          style={{ background: `hsl(var(${c.cssVar}))` }}
        />
      ))}
      <div className="mx-1 h-5 w-px bg-paper-edge" />
      <button
        type="button"
        onClick={onPickUnderline}
        title="Underline with pen"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          currentlyUnderlined
            ? "bg-leather text-paper"
            : "bg-paper text-leather hover:bg-paper-warm"
        }`}
      >
        <PenLine className="h-4 w-4" />
      </button>
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          title="Clear highlight or underline"
          className="flex h-8 w-8 items-center justify-center rounded-full text-leather hover:bg-paper-warm"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
