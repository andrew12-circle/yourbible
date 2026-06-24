import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Monitor, Pause, Play, Square, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import {
  useJournalVideoCapture,
  type JournalVideoCaptureMode,
} from "@/hooks/useJournalVideoCapture";
import { useIsMobile } from "@/hooks/use-mobile";
import { screenCaptureSupported } from "@/lib/journal/screenRecordingComposite";
import {
  formatJournalVideoClock,
  formatJournalVideoSizeMb,
  journalVideoEffectiveRemainingMs,
  journalVideoRemainingMs,
  JOURNAL_VIDEO_MAX_UPLOAD_BYTES,
} from "@/lib/journal/journalVideoLimits";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (blob: Blob, durationMs: number) => void | Promise<void>;
  uploading?: boolean;
  transcribing?: boolean;
  /** Skip the Camera vs Screen picker (e.g. when the toolbar Video button is tapped). */
  defaultMode?: JournalVideoCaptureMode;
};

export default function JournalVideoCaptureDialog({
  open,
  onOpenChange,
  onComplete,
  uploading = false,
  transcribing = false,
  defaultMode,
}: Props) {
  const isMobile = useIsMobile();
  const countdownStartedRef = useRef(false);
  const bindPreviewRef = useRef<(el: HTMLVideoElement | null) => void>(() => {});
  const stopOnMaxRef = useRef<() => void>(() => {});
  const [pickMode, setPickMode] = useState<JournalVideoCaptureMode | null>(null);

  const capture = useJournalVideoCapture({
    onMaxDuration: () => {
      stopOnMaxRef.current();
    },
  });
  const openPreviewRef = useRef(capture.openPreview);
  const cancelRef = useRef(capture.cancel);
  const beginCountdownRef = useRef(capture.beginCountdown);
  openPreviewRef.current = capture.openPreview;
  cancelRef.current = capture.cancel;
  beginCountdownRef.current = capture.beginCountdown;
  bindPreviewRef.current = capture.bindPreview;

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    bindPreviewRef.current(el);
  }, []);

  useEffect(() => {
    if (!open) {
      setPickMode(null);
      countdownStartedRef.current = false;
      return;
    }
    // Mobile has no screen-share workflow — open the front camera immediately.
    if (isMobile || defaultMode) {
      setPickMode(defaultMode ?? "camera");
    }
    return () => {
      countdownStartedRef.current = false;
      cancelRef.current();
    };
  }, [open, isMobile, defaultMode]);

  useEffect(() => {
    if (!open || !pickMode) return;
    countdownStartedRef.current = false;
    void openPreviewRef.current(pickMode);
  }, [open, pickMode]);

  useEffect(() => {
    if (capture.phase === "preview" && !countdownStartedRef.current && pickMode) {
      countdownStartedRef.current = true;
      beginCountdownRef.current();
    }
  }, [capture.phase, pickMode]);

  const handleClose = () => {
    capture.cancel();
    setPickMode(null);
    onOpenChange(false);
  };

  const handleStop = async () => {
    const durationMs = capture.recordingElapsedMs;
    const blob = await capture.stopRecording();
    if (!blob) {
      handleClose();
      return;
    }
    await onComplete(blob, durationMs);
  };

  stopOnMaxRef.current = () => {
    void handleStop();
  };

  const recording = capture.phase === "recording";
  const paused = capture.phase === "paused";
  const active = recording || paused;
  const processing = capture.phase === "processing" || uploading || transcribing;
  const ready = capture.phase === "preview" || capture.phase === "countdown" || active;
  const starting = open && pickMode !== null && capture.phase === "idle" && !capture.error;
  const showCountdown = capture.phase === "countdown" && capture.countdown != null;
  const showPicker = open && pickMode === null && !processing && !isMobile && !defaultMode;
  const isScreen = capture.mode === "screen";
  const remainingClock = formatJournalVideoClock(capture.recordingRemainingMs);
  const sizeLabel = formatJournalVideoSizeMb(capture.recordingBytes, 0);
  const sizeCapLabel = formatJournalVideoSizeMb(JOURNAL_VIDEO_MAX_UPLOAD_BYTES, 0);
  const lowTime = active && capture.recordingRemainingMs <= 60_000;
  const sizeLimited =
    active &&
    capture.recordingBytes > 0 &&
    journalVideoEffectiveRemainingMs(capture.recordingElapsedMs, capture.recordingBytes) <
      journalVideoRemainingMs(capture.recordingElapsedMs);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          isScreen ? "sm:max-w-4xl" : "sm:max-w-lg",
          // Full-screen on mobile — reset centered transform so portrait fits the viewport.
          "max-sm:fixed max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:flex max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none max-sm:border-0",
          // Capture UI provides its own close control.
          "[&>button.absolute]:hidden",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Video journal</DialogTitle>
          <DialogDescription>Record yourself or your screen with a camera bubble.</DialogDescription>
        </DialogHeader>

        {showPicker ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 bg-background px-6 py-10">
            <div className="text-center">
              <p className="text-lg font-semibold">How do you want to record?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Camera only, or screen share with you in a corner — like Loom.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-auto flex-1 flex-col gap-2 py-5"
                onClick={() => setPickMode("camera")}
              >
                <Video className="h-8 w-8" />
                <span className="font-medium">Camera</span>
                <span className="text-xs font-normal text-muted-foreground">Mirror-style selfie</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto flex-1 flex-col gap-2 py-5"
                disabled={!screenCaptureSupported()}
                onClick={() => setPickMode("screen")}
              >
                <Monitor className="h-8 w-8" />
                <span className="font-medium">Screen + me</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {screenCaptureSupported() ? "You in bottom-left bubble" : "Desktop browsers only"}
                </span>
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col bg-black",
              isMobile
                ? "h-full"
                : isScreen
                  ? "min-h-[50vh] sm:min-h-[360px]"
                  : "min-h-[50vh] sm:min-h-[420px]",
            )}
          >
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "min-h-0 w-full flex-1",
                isMobile ? "h-full object-cover" : "h-full",
                !isMobile && isScreen
                  ? "min-h-[50vh] object-contain sm:min-h-[360px]"
                  : !isMobile
                    ? "min-h-[50vh] object-cover sm:min-h-[420px]"
                    : null,
                !isScreen && "[transform:scaleX(-1)]",
                !ready && "invisible",
              )}
            />

            {starting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                <p className="text-sm text-white/70">
                  {pickMode === "screen" ? "Choose what to share…" : "Connecting camera…"}
                </p>
              </div>
            ) : null}

            {showCountdown ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-7xl font-bold tabular-nums text-white animate-pulse">
                  {capture.countdown}
                </span>
              </div>
            ) : null}

            {active ? (
              <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full bg-red-500",
                      recording && "animate-pulse",
                    )}
                    aria-hidden
                  />
                  {paused ? "Paused" : isScreen ? "Recording screen" : "Recording"}
                </div>
                <div
                  className={cn(
                    "rounded-full bg-black/50 px-3 py-1 text-sm font-medium tabular-nums text-white backdrop-blur-sm",
                    lowTime && "text-amber-300",
                  )}
                  aria-live="polite"
                  aria-label={`${remainingClock} remaining, ${sizeLabel} of ${sizeCapLabel} used`}
                >
                  {remainingClock}
                  <span className="mx-1.5 text-white/40" aria-hidden>
                    ·
                  </span>
                  <span className="text-[11px] font-normal text-white/75">
                    {sizeLabel}/{sizeCapLabel}
                  </span>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
              onClick={handleClose}
              disabled={processing}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
              <DictInterimPreview
                text={capture.interim}
                className="mb-4 min-h-[1.5rem] text-center text-sm italic leading-relaxed text-white/90"
              />

              {capture.error ? (
                <div className="mb-3 flex flex-col items-center gap-2">
                  <p className="text-center text-sm text-red-300">{capture.error}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      capture.cancel();
                      setPickMode(isMobile || defaultMode ? (defaultMode ?? "camera") : null);
                    }}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-4">
                {processing ? (
                  <div className="flex flex-col items-center gap-1 text-sm text-white/90">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {transcribing ? "Transcribing…" : "Saving video…"}
                  </div>
                ) : active ? (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      variant="secondary"
                      className="h-14 w-14 rounded-full p-0"
                      onClick={paused ? capture.resumeRecording : capture.pauseRecording}
                      aria-label={paused ? "Resume recording" : "Pause recording"}
                    >
                      {paused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="destructive"
                      className="h-14 w-14 rounded-full p-0"
                      onClick={() => void handleStop()}
                      aria-label="Stop recording"
                    >
                      <Square className="h-6 w-6 fill-current" />
                    </Button>
                  </>
                ) : null}
              </div>

              <p className="mt-3 text-center text-xs text-white/60">
                {active
                  ? paused
                    ? "Paused — tap play to continue or stop to save."
                    : lowTime
                      ? sizeLimited
                        ? "Almost at the upload size limit — recording stops automatically."
                        : "Less than a minute left — recording stops automatically at 0:00."
                      : isScreen
                        ? "Your screen is recording with your camera in the corner."
                        : "Talk naturally. Tap pause if you need a moment."
                  : showCountdown
                    ? "Get ready…"
                    : "Recording starts automatically after the countdown."}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
