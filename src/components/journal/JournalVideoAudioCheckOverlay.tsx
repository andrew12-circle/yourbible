import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalVideoMicMeter } from "@/components/journal/JournalVideoMicMeter";
import { cn } from "@/lib/utils";

type Props = {
  level: number;
  detected: boolean;
  onContinue: () => void;
  className?: string;
};

/** Pre-recording prompt: confirm the mic is working before the countdown starts. */
export function JournalVideoAudioCheckOverlay({ level, detected, onContinue, className }: Props) {
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
          Say <span className="font-medium text-white">&ldquo;test, test&rdquo;</span> — green bars mean
          your mic is picking you up.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <JournalVideoMicMeter level={level} className="scale-125 [&_span]:w-1.5" />
        <p className="text-xs text-white/70">
          {detected ? "Sounds good — starting…" : "Waiting for your voice…"}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full px-5"
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
