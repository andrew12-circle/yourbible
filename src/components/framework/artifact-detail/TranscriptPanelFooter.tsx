import { Maximize2, Minimize2 } from "lucide-react";
import TranscriptAutoScrollToggle from "@/components/framework/artifact-detail/TranscriptAutoScrollToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type Props = {
  autoScrollEnabled: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  showPlaybackRate?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  className?: string;
};

export default function TranscriptPanelFooter({
  autoScrollEnabled,
  onAutoScrollChange,
  playbackRate,
  onPlaybackRateChange,
  showPlaybackRate = true,
  expanded = false,
  onToggleExpanded,
  className,
}: Props) {
  const rateLabel = `${playbackRate % 1 === 0 ? playbackRate.toFixed(1) : playbackRate}x`;

  return (
    <footer
      className={cn(
        "mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border/50 px-4 py-3",
        className,
      )}
    >
      <TranscriptAutoScrollToggle
        id="transcript-auto-scroll-footer"
        enabled={autoScrollEnabled}
        onChange={onAutoScrollChange}
        className="justify-start gap-2.5"
      />

      <div className="flex items-center gap-2">
        {showPlaybackRate ? (
          <Select
            value={String(playbackRate)}
            onValueChange={(v) => onPlaybackRateChange(Number.parseFloat(v))}
          >
            <SelectTrigger
              className="h-8 w-[4.25rem] gap-0.5 rounded-lg border-border/60 bg-background px-2 text-xs font-medium tabular-nums shadow-sm"
              aria-label="Playback speed"
            >
              <SelectValue>{rateLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {PLAYBACK_RATES.map((rate) => (
                <SelectItem key={rate} value={String(rate)} className="text-xs tabular-nums">
                  {rate}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {onToggleExpanded ? (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground shadow-sm transition hover:bg-muted/40 hover:text-foreground"
            aria-label={expanded ? "Exit expanded transcript" : "Expand transcript"}
            onClick={onToggleExpanded}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
    </footer>
  );
}
