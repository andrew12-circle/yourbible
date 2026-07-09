import { useMicWaveformFromStream } from "@/hooks/useMicWaveformFromStream";
import { cn } from "@/lib/utils";

type Props = {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
  maxBarHeight?: number;
};

/** Compact live mic waveform driven by the recorder stream. */
export function JournalVideoLiveMicWaveform({
  stream,
  active,
  className,
  maxBarHeight = 18,
}: Props) {
  const levels = useMicWaveformFromStream(stream, active);
  const minBarHeight = 3;

  return (
    <div
      className={cn("flex items-end justify-center gap-0.5", className)}
      role="img"
      aria-label={active ? "Microphone level" : "Microphone inactive"}
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="inline-block w-1 shrink-0 rounded-sm bg-white/35 transition-[height] duration-75 ease-out"
          style={{
            height: `${Math.max(minBarHeight, level * maxBarHeight)}px`,
          }}
        />
      ))}
    </div>
  );
}
