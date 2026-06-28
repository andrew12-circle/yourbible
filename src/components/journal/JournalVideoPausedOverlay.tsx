import { MicOff, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type JournalVideoPauseReason = "silence" | "manual";

type Props = {
  reason: JournalVideoPauseReason;
  onResume: () => void;
  className?: string;
};

export function JournalVideoPausedOverlay({ reason, onResume, className }: Props) {
  const silence = reason === "silence";

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[3px]",
        className,
      )}
      role="status"
      aria-live="assertive"
    >
      <div className="mx-6 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-white/20 bg-black/75 px-8 py-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            silence ? "bg-amber-500/25" : "bg-white/10",
          )}
        >
          {silence ? (
            <MicOff className="h-8 w-8 text-amber-300" aria-hidden />
          ) : (
            <Pause className="h-8 w-8 text-white" aria-hidden />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-semibold tracking-tight text-white">Recording paused</p>
          <p className="text-sm leading-relaxed text-white/80">
            {silence
              ? "No speech detected for a few seconds — we paused so you don't lose your place. Tap resume when you're ready to keep talking."
              : "Tap resume when you're ready to keep recording."}
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className="min-w-[9rem] gap-2 bg-white text-black hover:bg-white/90"
          onClick={onResume}
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          Resume
        </Button>
      </div>
    </div>
  );
}
