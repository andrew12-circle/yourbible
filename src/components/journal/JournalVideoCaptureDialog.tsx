import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Monitor, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { JournalVideoCaptureReview } from "@/components/journal/JournalVideoCaptureReview";
import { JournalVideoAudioCheckOverlay } from "@/components/journal/JournalVideoAudioCheckOverlay";
import { JournalVideoCaptureToolbar } from "@/components/journal/JournalVideoCaptureToolbar";
import { JournalVideoFloatingShell } from "@/components/journal/JournalVideoFloatingShell";
import { JournalVideoPausedOverlay, type JournalVideoPauseReason } from "@/components/journal/JournalVideoPausedOverlay";
import { LiveTranscriptTicker } from "@/components/journal/LiveTranscriptTicker";
import {
  useJournalVideoCapture,
  type JournalVideoCaptureMode,
  type JournalVideoCapturePhase,
  type JournalVideoCaptureResult,
} from "@/hooks/useJournalVideoCapture";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSilenceAutoPause } from "@/hooks/useSilenceAutoPause";
import { useMicLevel } from "@/hooks/useMicLevel";
import { useJournalVideoAudioCheck } from "@/hooks/useJournalVideoAudioCheck";
import { screenCaptureSupported } from "@/lib/journal/screenRecordingComposite";
import { JOURNAL_VIDEO_SILENCE_AUTO_PAUSE_SECONDS } from "@/lib/journal/journalVideoCaptureSettings";
import {
  formatJournalVideoClock,
  formatJournalVideoSizeMb,
  journalVideoEffectiveRemainingMs,
  journalVideoRemainingMs,
  JOURNAL_VIDEO_MAX_UPLOAD_BYTES,
} from "@/lib/journal/journalVideoLimits";
import { clearInProgressJournalVideoRecording } from "@/lib/journal/journalVideoRecordingRecovery";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: JournalVideoCaptureResult, durationMs: number) => void | Promise<void>;
  uploading?: boolean;
  transcribing?: boolean;
  transcribingLabel?: string;
  defaultMode?: JournalVideoCaptureMode;
  onRecordingStart?: () => void;
  onLiveTranscript?: (text: string) => void;
  recovery?: {
    userId: string;
    entryId: string;
    anchorOffset: number;
  };
  /** One-line prompt shown above the live transcript while recording. */
  teleprompter?: string;
  /** Show retake / confirm step before calling onComplete. */
  reviewBeforeUpload?: boolean;
  /** Called when recording stops and review begins — before the user taps confirm. */
  onReviewReady?: (result: JournalVideoCaptureResult, durationMs: number) => void;
  confirmLabel?: string;
  reviewHint?: string;
  /** Render above other app modals (week review gate, etc.). */
  stackElevated?: boolean;
  /** Disable floating desktop recorder — use full dialog pane. */
  forceInline?: boolean;
};

type PendingReview = {
  result: JournalVideoCaptureResult;
  durationMs: number;
};

export default function JournalVideoCaptureDialog({
  open,
  onOpenChange,
  onComplete,
  uploading = false,
  transcribing = false,
  transcribingLabel,
  defaultMode,
  onRecordingStart,
  onLiveTranscript,
  recovery,
  teleprompter,
  reviewBeforeUpload = true,
  onReviewReady,
  confirmLabel,
  reviewHint,
  stackElevated = false,
  forceInline = false,
}: Props) {
  const isMobile = useIsMobile();
  const countdownStartedRef = useRef(false);
  const prevPhaseRef = useRef<JournalVideoCapturePhase>("idle");
  const [countdownDeferred, setCountdownDeferred] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bindPreviewRef = useRef<(el: HTMLVideoElement | null) => void>(() => {});
  const stopOnMaxRef = useRef<() => void>(() => {});
  const [pickMode, setPickMode] = useState<JournalVideoCaptureMode | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [pauseReason, setPauseReason] = useState<JournalVideoPauseReason | null>(null);

  const capture = useJournalVideoCapture({
    onMaxDuration: () => {
      stopOnMaxRef.current();
    },
    onInterim: onLiveTranscript,
    recovery,
  });
  const openPreviewRef = useRef(capture.openPreview);
  const cancelRef = useRef(capture.cancel);
  const cancelCountdownRef = useRef(capture.cancelCountdown);
  cancelCountdownRef.current = capture.cancelCountdown;
  const beginCountdownRef = useRef(capture.beginCountdown);
  openPreviewRef.current = capture.openPreview;
  cancelRef.current = capture.cancel;
  beginCountdownRef.current = capture.beginCountdown;
  bindPreviewRef.current = capture.bindPreview;

  useEffect(() => {
    if (prevPhaseRef.current === "countdown" && capture.phase === "preview") {
      setCountdownDeferred(true);
    }
    prevPhaseRef.current = capture.phase;
  }, [capture.phase]);

  const handleCancelCountdown = useCallback(() => {
    cancelCountdownRef.current();
    setCountdownDeferred(true);
  }, []);

  const handleStartCountdown = useCallback(() => {
    setCountdownDeferred(false);
    beginCountdownRef.current();
  }, []);
  const pauseRecordingRef = useRef(capture.pauseRecording);
  pauseRecordingRef.current = capture.pauseRecording;
  const resumeRecordingRef = useRef(capture.resumeRecording);
  resumeRecordingRef.current = capture.resumeRecording;

  const micLevel = useMicLevel(capture.previewStream, capture.phase === "recording" || capture.phase === "preview" || capture.phase === "countdown");
  const previewHasAudio = (capture.previewStream?.getAudioTracks().length ?? 0) > 0;
  const audioCheckActive = capture.phase === "preview" && previewHasAudio && !countdownDeferred;
  const audioCheck = useJournalVideoAudioCheck(micLevel, audioCheckActive);
  const { passed: audioCheckPassed, markPassed: markAudioCheckPassed, reset: resetAudioCheck } =
    audioCheck;
  useSilenceAutoPause({
    enabled:
      capture.settings.silenceAutoPause &&
      capture.phase === "recording" &&
      capture.mode === "camera",
    level: micLevel,
    silenceSeconds: JOURNAL_VIDEO_SILENCE_AUTO_PAUSE_SECONDS,
    onSilence: () => {
      setPauseReason("silence");
      pauseRecordingRef.current();
    },
  });

  const handleResumeRecording = useCallback(() => {
    setPauseReason(null);
    resumeRecordingRef.current();
  }, []);

  const handlePauseRecording = useCallback(() => {
    setPauseReason("manual");
    pauseRecordingRef.current();
  }, []);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    bindPreviewRef.current(el);
  }, []);

  const floating =
    !forceInline &&
    !isMobile &&
    capture.settings.floatingRecorder &&
    capture.mode === "camera" &&
    pickMode === "camera" &&
    !pendingReview;

  useEffect(() => {
    if (!open) {
      setPickMode(null);
      setPendingReview(null);
      setPauseReason(null);
      setCountdownDeferred(false);
      countdownStartedRef.current = false;
      return;
    }
    if (isMobile || defaultMode) {
      setPickMode(defaultMode ?? "camera");
    }
    return () => {
      countdownStartedRef.current = false;
      cancelRef.current();
    };
  }, [open, isMobile, defaultMode]);

  useEffect(() => {
    if (!open || !pickMode || pendingReview) return;
    countdownStartedRef.current = false;
    void openPreviewRef.current(pickMode);
  }, [open, pickMode, pendingReview]);

  useEffect(() => {
    if (!open) {
      resetAudioCheck();
    }
  }, [open, resetAudioCheck]);

  useEffect(() => {
    if (capture.phase === "preview" && capture.previewStream && !previewHasAudio) {
      markAudioCheckPassed();
    }
  }, [capture.phase, capture.previewStream, previewHasAudio, markAudioCheckPassed]);

  useEffect(() => {
    if (
      capture.phase === "preview" &&
      !countdownStartedRef.current &&
      !countdownDeferred &&
      audioCheckPassed &&
      pickMode &&
      !pendingReview
    ) {
      countdownStartedRef.current = true;
      beginCountdownRef.current();
    }
  }, [capture.phase, pickMode, pendingReview, countdownDeferred, audioCheckPassed]);

  const recordingStartHandledRef = useRef(false);

  useEffect(() => {
    if (
      capture.phase === "idle" ||
      capture.phase === "preview" ||
      capture.phase === "countdown"
    ) {
      recordingStartHandledRef.current = false;
      return;
    }
    if (capture.phase === "recording" && !recordingStartHandledRef.current) {
      recordingStartHandledRef.current = true;
      onRecordingStart?.();
    }
  }, [capture.phase, onRecordingStart]);

  const handleClose = () => {
    capture.cancel();
    setPickMode(null);
    setPendingReview(null);
    setPauseReason(null);
    onOpenChange(false);
  };

  const finishCapture = async (result: JournalVideoCaptureResult, durationMs: number) => {
    onReviewReady?.(result, durationMs);
    if (reviewBeforeUpload) {
      setPendingReview({ result, durationMs });
      return;
    }
    await onComplete(result, durationMs);
  };

  const handleStop = async () => {
    const result = await capture.stopRecording();
    if (!result) {
      handleClose();
      return;
    }
    await finishCapture(result, result.durationMs);
  };

  stopOnMaxRef.current = () => {
    void handleStop();
  };

  const handleRetake = () => {
    void clearInProgressJournalVideoRecording(pendingReview?.result.recoveryDraftId);
    setPendingReview(null);
    setCountdownDeferred(false);
    countdownStartedRef.current = false;
    resetAudioCheck();
    void capture.openPreview(pickMode ?? defaultMode ?? "camera");
  };

  const handleConfirmReview = async () => {
    if (!pendingReview) return;
    await onComplete(pendingReview.result, pendingReview.durationMs);
    setPendingReview(null);
    onOpenChange(false);
  };

  const recording = capture.phase === "recording";
  const paused = capture.phase === "paused";
  const active = recording || paused;
  const processing = capture.phase === "processing" || uploading || transcribing;
  const ready = capture.phase === "preview" || capture.phase === "countdown" || active;
  const starting = open && pickMode !== null && capture.phase === "idle" && !capture.error;
  const showAudioCheck =
    capture.phase === "preview" && previewHasAudio && !audioCheckPassed && !countdownDeferred;
  const showCountdown = capture.phase === "countdown" && capture.countdown != null;
  const showPicker =
    open && pickMode === null && !processing && !pendingReview && !isMobile && !defaultMode;
  const isScreen = capture.mode === "screen";
  const elapsedClock = formatJournalVideoClock(capture.recordingElapsedMs);
  const sizeLabel = formatJournalVideoSizeMb(capture.recordingBytes, 0);
  const sizeCapLabel = formatJournalVideoSizeMb(JOURNAL_VIDEO_MAX_UPLOAD_BYTES, 0);
  const lowTime = active && capture.recordingRemainingMs <= 60_000;
  const sizeLimited =
    active &&
    capture.recordingBytes > 0 &&
    journalVideoEffectiveRemainingMs(capture.recordingElapsedMs, capture.recordingBytes) <
      journalVideoRemainingMs(capture.recordingElapsedMs);

  const captureBody = (
    <div
      className={cn(
        "relative flex w-full items-center justify-center bg-black",
        floating
          ? "h-full min-h-0 w-full"
          : isMobile
            ? "h-full min-h-0 flex-1"
            : isScreen
              ? "min-h-[50vh] flex-1 sm:min-h-[360px]"
              : "aspect-video max-h-[min(72vh,810px)]",
      )}
    >
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "h-full w-full object-contain",
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

      {showAudioCheck ? (
        <JournalVideoAudioCheckOverlay
          level={micLevel}
          detected={audioCheckPassed}
          onContinue={markAudioCheckPassed}
        />
      ) : null}

      {showCountdown ? (
        <button
          type="button"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white"
          onClick={handleCancelCountdown}
          aria-label="Pause countdown and adjust settings"
        >
          <span className="text-7xl font-bold tabular-nums animate-pulse">{capture.countdown}</span>
          <span className="text-sm text-white/80">Tap to pause and adjust settings</span>
        </button>
      ) : null}

      {active ? (
        <div className="absolute left-3 top-3 flex flex-col gap-1.5 sm:left-4 sm:top-4">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
            <span
              className={cn("h-2.5 w-2.5 rounded-full bg-red-500", recording && "animate-pulse")}
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
          >
            {elapsedClock}
            <span className="mx-1.5 text-white/40" aria-hidden>
              ·
            </span>
            <span className="text-[11px] font-normal text-white/75">
              {sizeLabel}/{sizeCapLabel}
            </span>
          </div>
        </div>
      ) : null}

      {paused ? (
        <JournalVideoPausedOverlay
          reason={pauseReason ?? "manual"}
          onResume={handleResumeRecording}
        />
      ) : null}

      {!floating ? (
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
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
          onClick={handleClose}
          disabled={processing}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:px-4 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-10">
        {teleprompter?.trim() ? (
          <p className="mb-2 line-clamp-2 text-center text-xs font-medium text-white/80 sm:text-sm">
            {teleprompter.trim()}
          </p>
        ) : null}

        <LiveTranscriptTicker text={capture.interim} className="mb-2 text-sm italic text-white/90" />

        <div className="flex justify-center">
          <JournalVideoCaptureToolbar
            capture={capture}
            isMobile={isMobile}
            videoRef={videoRef}
            active={active}
            paused={paused}
            processing={processing}
            countdownDeferred={countdownDeferred}
            menuElevated={stackElevated}
            onStartCountdown={handleStartCountdown}
            onPauseResume={
              active && !processing
                ? () => (paused ? handleResumeRecording() : handlePauseRecording())
                : undefined
            }
            onStop={active && !processing ? () => void handleStop() : undefined}
          />
        </div>

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

        <p className="mt-3 text-center text-[11px] text-white/60 sm:text-xs">
          {processing
            ? transcribing
              ? (transcribingLabel ?? "Transcribing…")
              : "Saving video…"
            : active
            ? paused
              ? "Paused — tap play to continue or stop to save."
              : lowTime
                ? sizeLimited
                  ? "Almost at the upload size limit — recording stops automatically."
                  : "Less than a minute left — recording stops automatically at the limit."
                : isScreen
                  ? "Your screen is recording with your camera in the corner."
                  : "Talk naturally. Tap pause if you need a moment."
              : showAudioCheck
                ? "Say test, test to confirm your mic, or tap Continue."
              : showCountdown
              ? "Get ready… tap the screen to pause, or tap Start now."
              : countdownDeferred
                ? "Adjust webcam and mic, then tap Start countdown."
              : capture.settings.countdown === 0
                ? "Recording starts when the camera is ready."
                : "Recording starts after the countdown."}
        </p>
      </div>
    </div>
  );

  const picker = (
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
            {screenCaptureSupported() ? "You in a corner bubble" : "Desktop browsers only"}
          </span>
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
        Cancel
      </Button>
    </div>
  );

  const reviewPanel = pendingReview ? (
    <JournalVideoCaptureReview
      result={pendingReview.result}
      durationMs={pendingReview.durationMs}
      onRetake={handleRetake}
      onConfirm={() => void handleConfirmReview()}
      confirming={uploading || transcribing}
      confirmLabel={confirmLabel}
      reviewHint={reviewHint}
    />
  ) : null;

  if (!open) return null;

  if (floating && !showPicker && !pendingReview) {
    return createPortal(
      <JournalVideoFloatingShell enabled>{captureBody}</JournalVideoFloatingShell>,
      document.body,
    );
  }

  const dialogBodyClass = cn(
    "gap-0 overflow-hidden p-0",
    pendingReview ? "sm:max-w-lg" : isScreen ? "sm:max-w-4xl" : "sm:max-w-3xl",
    !pendingReview &&
      "max-sm:fixed max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:flex max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none max-sm:border-0",
    "[&>button.absolute]:hidden",
  );

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      {stackElevated ? (
        <DialogPortal>
          <DialogOverlay className="z-[100]" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
              dialogBodyClass,
            )}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Video journal</DialogTitle>
              <DialogDescription>Record yourself or your screen with a camera bubble.</DialogDescription>
            </DialogHeader>
            {pendingReview ? reviewPanel : showPicker ? picker : captureBody}
          </DialogPrimitive.Content>
        </DialogPortal>
      ) : (
        <DialogContent className={dialogBodyClass}>
          <DialogHeader className="sr-only">
            <DialogTitle>Video journal</DialogTitle>
            <DialogDescription>Record yourself or your screen with a camera bubble.</DialogDescription>
          </DialogHeader>
          {pendingReview ? reviewPanel : showPicker ? picker : captureBody}
        </DialogContent>
      )}
    </Dialog>
  );
}
