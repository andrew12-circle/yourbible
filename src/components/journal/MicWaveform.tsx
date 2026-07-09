import { useMicWaveform } from "@/hooks/useMicWaveform";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  className?: string;
  /** Pixel height of the tallest bar at full level. */
  maxBarHeight?: number;
};

export function MicWaveform({ active, className, maxBarHeight = 26 }: Props) {
  const levels = useMicWaveform(active);
  const minBarHeight = 3;

  return (
    <div
      className={cn("flex items-center justify-center gap-[3px]", className)}
      role="img"
      aria-label={active ? "Listening to your voice" : "Microphone inactive"}
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="inline-block w-[3px] shrink-0 rounded-full bg-foreground/55 transition-[height] duration-75 ease-out dark:bg-foreground/65"
          style={{
            height: `${Math.max(minBarHeight, level * maxBarHeight)}px`,
          }}
        />
      ))}
    </div>
  );
}
