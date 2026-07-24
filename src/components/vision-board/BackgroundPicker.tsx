import { BACKGROUND_KEYS, type BackgroundKey } from "@/lib/vision-board/boardGeometry";
import { cn } from "@/lib/utils";

const LABELS: Record<BackgroundKey, string> = {
  cork: "Cork",
  wood: "Wood",
  linen: "Linen",
  felt: "Felt",
};

type Props = {
  value: BackgroundKey;
  onChange: (key: BackgroundKey) => void;
  className?: string;
};

export function BackgroundPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Board background">
      {BACKGROUND_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          title={LABELS[key]}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "h-8 w-8 rounded-md border-2 shadow-sm transition-transform",
            `vision-board-surface vision-board-surface--${key}`,
            value === key ? "border-white scale-110 ring-2 ring-black/30" : "border-black/20 opacity-90 hover:opacity-100",
          )}
        />
      ))}
    </div>
  );
}
