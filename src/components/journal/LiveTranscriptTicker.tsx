import { liveTranscriptTickerLine } from "@/lib/journal/journalVideoBody";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  /** Reserve a single line of height even when empty (video overlay). */
  reserveSpace?: boolean;
};

/** Single-line live caption — shows the latest words without stacking over the camera. */
export function LiveTranscriptTicker({ text, className, reserveSpace = true }: Props) {
  const line = liveTranscriptTickerLine(text);
  if (!line) {
    return reserveSpace ? <div className={cn("h-6", className)} aria-hidden /> : null;
  }
  return (
    <p
      className={cn("h-6 truncate whitespace-nowrap text-center", className)}
      aria-live="polite"
      title={text.trim()}
    >
      {line}
    </p>
  );
}
