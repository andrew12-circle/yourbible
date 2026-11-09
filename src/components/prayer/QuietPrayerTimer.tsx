import { useState } from "react";
import { Check, Eye, EyeOff, Infinity as InfinityIcon, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuietPrayerTimer, type QuietPrayerDuration } from "@/hooks/useQuietPrayerTimer";
import { cn } from "@/lib/utils";

type Props = {
  initialMinutes?: number;
  title?: string;
  onReflect?: () => void;
};

const DURATIONS: { minutes: QuietPrayerDuration; label: string; ariaLabel: string }[] = [
  { minutes: 2, label: "2 min", ariaLabel: "2 minutes" },
  { minutes: 5, label: "5 min", ariaLabel: "5 minutes" },
  { minutes: 10, label: "10 min", ariaLabel: "10 minutes" },
  { minutes: null, label: "Open", ariaLabel: "Open-ended" },
];

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function QuietPrayerTimer({ initialMinutes = 5, title = "Quiet time", onReflect }: Props) {
  const timer = useQuietPrayerTimer(initialMinutes);
  const [showTime, setShowTime] = useState(true);
  const running = timer.phase === "running";
  const finished = timer.phase === "finished";
  const message = finished
    ? "Your quiet time is complete. Stay as long as you like."
    : timer.phase === "paused"
      ? "Take your time. Resume when you are ready."
      : running
        ? "There is nothing you need to produce."
        : "Begin whenever you are ready.";

  return (
    <section aria-label={title} className="rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50/70 to-background p-5 text-center dark:border-sky-900/50 dark:from-sky-950/20 sm:p-7">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-sky-800 dark:text-sky-300">{title}</p>
      <div role="group" aria-label="Quiet time duration" className="mx-auto grid max-w-sm grid-cols-4 gap-1 rounded-xl bg-background/80 p-1 ring-1 ring-border/60">
        {DURATIONS.map(({ minutes, label, ariaLabel }) => (
          <button
            key={label}
            type="button"
            aria-label={ariaLabel}
            aria-pressed={timer.durationMinutes === minutes}
            disabled={running}
            onClick={() => timer.setDurationMinutes(minutes)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default motion-reduce:transition-none",
              timer.durationMinutes === minutes
                ? "bg-sky-100 text-sky-950 dark:bg-sky-900/70 dark:text-sky-100"
                : "text-muted-foreground hover:bg-muted disabled:hover:bg-transparent",
            )}
          >
            {minutes === null && <InfinityIcon className="h-3.5 w-3.5" aria-hidden />}
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-40 flex-col items-center justify-center py-7">
        {finished ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100/80 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            <Check className="h-7 w-7" aria-hidden />
          </div>
        ) : showTime ? (
          <>
            <p role="timer" aria-live="off" aria-label={timer.remainingMs === null ? "Time spent in quiet" : "Time remaining"} className="font-sans text-5xl font-light tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
              {formatTime(timer.remainingMs ?? timer.elapsedMs)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{timer.remainingMs === null ? "No time limit" : "A little space to be still"}</p>
          </>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-sky-200/60 bg-sky-100/50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
            <span className="font-serif text-lg">Be still</span>
          </div>
        )}
      </div>

      <p role="status" className="mx-auto mb-5 max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {finished ? (
          <>
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={timer.continueSitting}>Continue sitting</Button>
            {onReflect && <Button type="button" className="min-h-11 rounded-xl" onClick={onReflect}>Reflect</Button>}
          </>
        ) : (
          <>
            <Button type="button" className="min-h-11 min-w-36 rounded-xl" onClick={running ? timer.pause : timer.start}>
              {running ? <Pause aria-hidden /> : <Play aria-hidden />}
              {running ? "Pause" : timer.phase === "paused" ? "Resume" : "Begin quiet time"}
            </Button>
            {timer.phase === "paused" && (
              <Button type="button" variant="ghost" className="min-h-11 rounded-xl" onClick={timer.reset}>
                <RotateCcw aria-hidden />Reset
              </Button>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-xl text-xs text-muted-foreground" aria-pressed={timer.soundEnabled} onClick={() => timer.setSoundEnabled(!timer.soundEnabled)}>
          {timer.soundEnabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          End tone {timer.soundEnabled ? "on" : "off"}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-xl text-xs text-muted-foreground" aria-pressed={!showTime} onClick={() => setShowTime(!showTime)}>
          {showTime ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {showTime ? "Hide timer" : "Show timer"}
        </Button>
      </div>
      {timer.soundEnabled && timer.soundUnavailable && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">Sound is unavailable in this browser. Your quiet timer still works.</p>
      )}
    </section>
  );
}
