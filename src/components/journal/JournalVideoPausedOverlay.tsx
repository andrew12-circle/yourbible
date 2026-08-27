import { AlertTriangle, Loader2, MicOff, Pause, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type JournalVideoPauseReason =
  | "silence"
  | "manual"
  | "background"
  | "track-ended"
  | "recorder-stopped"
  | "unknown"
  | "interrupted";

type BackupState = "idle" | "saving" | "saved" | "at-risk";

type Props = {
  reason: JournalVideoPauseReason;
  onResume: () => void;
  onSavePartial?: () => void;
  canResume?: boolean;
  backupState?: BackupState;
  backupError?: string | null;
  className?: string;
};

export function JournalVideoPausedOverlay({
  reason,
  onResume,
  onSavePartial,
  canResume = true,
  backupState = "idle",
  backupError,
  className,
}: Props) {
  const silence = reason === "silence";
  const interrupted =
    reason === "track-ended" ||
    reason === "recorder-stopped" ||
    reason === "unknown" ||
    reason === "interrupted";
  const backgrounded = reason === "background";

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-[3px] [-webkit-overflow-scrolling:touch]",
        className,
      )}
      role="status"
      aria-live="assertive"
    >
      <div
        className={cn(
          "flex min-h-full w-full flex-col",
          "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]",
          "pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
        )}
      >
        <div className="my-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-white/20 bg-black/75 px-6 py-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 [@media(max-height:520px)]:gap-3 [@media(max-height:520px)]:py-4 [@media(pointer:fine)]:px-8 [@media(pointer:fine)]:py-8">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full [@media(max-height:520px)]:hidden",
            silence || interrupted ? "bg-amber-500/25" : "bg-white/10",
          )}
        >
          {interrupted ? (
            <AlertTriangle className="h-8 w-8 text-amber-300" aria-hidden />
          ) : silence ? (
            <MicOff className="h-8 w-8 text-amber-300" aria-hidden />
          ) : (
            <Pause className="h-8 w-8 text-white" aria-hidden />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-semibold tracking-tight text-white">
            {interrupted ? "Recording interrupted" : "Recording paused"}
          </p>
          <p className="text-sm leading-relaxed text-white/80">
            {interrupted
              ? "Your captured video is still here. Save this part before starting another recording."
              : backgrounded
                ? "We paused when the app went into the background and checked your on-device backup."
                : silence
              ? "No speech detected for a few seconds — we paused so you don't lose your place. Take your time; tap resume when you're ready."
              : "Recording stays paused until you resume — take a call, write notes, or step away. Tap resume when you're ready."}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2 break-words text-xs text-white/75" aria-live="polite">
          {backupState === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : backupState === "saved" ? (
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden />
          ) : backupState === "at-risk" ? (
            <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />
          ) : null}
          <span>
            {backupState === "saving"
              ? "Securing this recording on your device…"
              : backupState === "saved"
                ? "Backed up on this device"
                : backupState === "at-risk"
                  ? (backupError ?? "Keep this recorder open while the backup finishes.")
                  : "Recording held on this device"}
          </span>
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <Button
            type="button"
            size="lg"
            className="min-h-11 min-w-[9rem] gap-2 bg-white text-black hover:bg-white/90"
            onClick={canResume ? onResume : onSavePartial}
            disabled={!canResume && !onSavePartial}
          >
            {canResume ? (
              <Play className="h-4 w-4 fill-current" aria-hidden />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden />
            )}
            {canResume ? "Resume" : "Save this part"}
          </Button>
          {canResume && onSavePartial ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[9rem] gap-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={onSavePartial}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Save this part
            </Button>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
