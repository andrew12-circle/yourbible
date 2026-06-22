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
import { screenCaptureSupported } from "@/lib/journal/screenRecordingComposite";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (blob: Blob, durationMs: number) => void | Promise<void>;
  uploading?: boolean;
  transcribing?: boolean;
};

export default function JournalVideoCaptureDialog({
  open,
  onOpenChange,
  onComplete,
  uploading = false,
  transcribing = false,
}: Props) {
  const recordStartedAtRef = useRef(0);
  const countdownStartedRef = useRef(false);
  const bindPreviewRef = useRef<(el: HTMLVideoElement | null) => void>(() => {});
  const [pickMode, setPickMode] = useState<JournalVideoCaptureMode | null>(null);

  const capture = useJournalVideoCapture({});
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
      recordStartedAtRef.current = 0;
      return;
    }
    return () => {
      countdownStartedRef.current = false;
      cancelRef.current();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !pickMode) return;
    recordStartedAtRef.current = 0;
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
    const started = recordStartedAtRef.current;
    const blob = await capture.stopRecording();
    if (!blob) {
      handleClose();
      return;
    }
    const durationMs = Math.max(0, Date.now() - started);
    await onComplete(blob, durationMs);
  };

  useEffect(() => {
    if (capture.phase === "recording" && recordStartedAtRef.current === 0) {
      recordStartedAtRef.current = Date.now();
    }
  }, [capture.phase]);

  const recording = capture.phase === "recording";
  const paused = capture.phase === "paused";
  const active = recording || paused;
  const processing = capture.phase === "processing" || uploading || transcribing;
  const ready = capture.phase === "preview" || capture.phase === "countdown" || active;
  const starting = open && pickMode !== null && capture.phase === "idle" && !capture.error;
  const showCountdown = capture.phase === "countdown" && capture.countdown != null;
  const showPicker = open && pickMode === null && !processing;
  const isScreen = capture.mode === "screen";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          isScreen ? "sm:max-w-4xl" : "sm:max-w-lg",
          "max-sm:fixed max-sm:inset-0 max-sm:h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
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
              "relative flex flex-1 flex-col bg-black",
              isScreen ? "min-h-[50vh] sm:min-h-[360px]" : "min-h-[50vh] sm:min-h-[420px]",
            )}
          >
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "h-full w-full flex-1",
                isScreen ? "min-h-[50vh] object-contain sm:min-h-[360px]" : "min-h-[50vh] object-cover sm:min-h-[420px]",
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
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full bg-red-500",
                    recording && "animate-pulse",
                  )}
                  aria-hidden
                />
                {paused ? "Paused" : isScreen ? "Recording screen" : "Recording"}
              </div>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
              onClick={handleClose}
              disabled={processing}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-5 pt-16">
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
                      setPickMode(null);
                      capture.cancel();
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
