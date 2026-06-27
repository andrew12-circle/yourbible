import { cn } from "@/lib/utils";

type Props = {
  level: number;
  className?: string;
};

/** Small mic level bars (0–1). */
export function JournalVideoMicMeter({ level, className }: Props) {
  const bars = [0.25, 0.5, 0.75, 1];
  return (
    <div
      className={cn("flex items-end gap-0.5", className)}
      aria-label="Microphone level"
      role="meter"
      aria-valuenow={Math.round(level * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {bars.map((threshold) => (
        <span
          key={threshold}
          className={cn(
            "w-1 rounded-sm bg-white/30 transition-colors",
            threshold <= 0.5 ? "h-2" : threshold <= 0.75 ? "h-3" : "h-4",
            level >= threshold * 0.85 && "bg-emerald-400",
          )}
        />
      ))}
    </div>
  );
}
