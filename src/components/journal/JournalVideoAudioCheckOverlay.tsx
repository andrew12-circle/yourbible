import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalVideoLiveMicWaveform } from "@/components/journal/JournalVideoLiveMicWaveform";
import { cn } from "@/lib/utils";

type Props = {
  stream: MediaStream | null;
  onContinue: () => void;
  className?: string;
};

/** Pre-recording prompt: confirm the mic is working before the countdown starts. */
export function JournalVideoAudioCheckOverlay({ stream, onContinue, className }: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/55 px-6 text-center text-white backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        <Mic className="h-6 w-6" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <p className="text-lg font-semibold">Make sure your audio is working</p>
        <p className="text-sm text-white/80">
          Say <span className="font-medium text-white">&ldquo;test, test&rdquo;</span> and watch the
          bars move. Take your time — recording starts when you tap below.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <JournalVideoLiveMicWaveform stream={stream} active className="h-6 gap-1 [&_span]:w-1.5" maxBarHeight={22} />
        <p className="text-xs text-white/70">Moving bars mean your mic is working</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full px-5"
        onClick={onContinue}
      >
        Continue to setup
      </Button>
    </div>
  );
}
