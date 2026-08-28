import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { AlertTriangle, Loader2, RotateCcw, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JournalVideoCaptureReview } from "@/components/journal/JournalVideoCaptureReview";
import type { JournalVideoCaptureDialogProps } from "@/components/journal/JournalVideoCaptureDialog";
import type { JournalVideoCaptureResult } from "@/lib/journal/journalVideoCaptureLifecycle";
import {
  formatJournalVideoClock,
  formatJournalVideoSizeMb,
  isJournalVideoUploadTooLarge,
  JOURNAL_VIDEO_MAX_DURATION_MS,
  JOURNAL_VIDEO_MAX_UPLOAD_BYTES,
  JOURNAL_VIDEO_RECORD_STOP_BYTES,
  journalVideoUploadTooLargeMessage,
} from "@/lib/journal/journalVideoLimits";
import {
  acknowledgeNativeJournalVideoQueued,
  buildNativeJournalVideoCaptureResult,
  createNativeJournalVideoSessionId,
  discardNativeJournalVideoCapture,
  findPendingNativeJournalVideoCapture,
  NativeJournalVideoCaptureCancelledError,
  readNativeJournalVideoBlob,
  resumeNativeJournalVideoCapture,
  startNativeJournalVideoCapture,
  waitForNativeJournalVideoCaptureReady,
  type NativeJournalVideoCaptureOwner,
  type NativeJournalVideoCaptureSnapshot,
} from "@/lib/native/journalVideoNative";
import { acquireNativeDarkStatusSurface } from "@/lib/native/nativeStatusBar";

type NativeDialogPhase =
  | "starting"
  | "capturing"
  | "interrupted"
  | "finalizing"
  | "materializing"
  | "review"
  | "saving"
  | "error";

type PendingReview = {
  result: JournalVideoCaptureResult;
  durationMs: number;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function phaseForCapture(capture: NativeJournalVideoCaptureSnapshot): NativeDialogPhase {
  if (capture.state === "interrupted" || capture.state === "paused") return "interrupted";
  if (capture.state === "finalizing" || capture.state === "pendingHandoff") return "finalizing";
  if (capture.state === "failed") return "error";
  return "capturing";
}

export function NativeJournalVideoCaptureDialog({
  open,
  onOpenChange,
  onComplete,
  uploading = false,
  transcribing = false,
  defaultMode,
  onRecordingStart,
  recovery,
  teleprompter,
  reviewBeforeUpload = true,
  onReviewReady,
  confirmLabel,
  reviewHint,
  retainNativeSourceAfterComplete = false,
  nativeCaptureContext,
}: JournalVideoCaptureDialogProps) {
  const [phase, setPhase] = useState<NativeDialogPhase>("starting");
  const [capture, setCapture] = useState<NativeJournalVideoCaptureSnapshot | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const recordingStartSessionRef = useRef<string | null>(null);
  const bootstrapRef = useRef<Promise<NativeJournalVideoCaptureSnapshot> | null>(null);
  const bootstrapOwnerKeyRef = useRef("");
  const activeSessionIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({
    onComplete,
    onOpenChange,
    onRecordingStart,
    onReviewReady,
    retainNativeSourceAfterComplete,
    reviewBeforeUpload,
  });
  callbacksRef.current = {
    onComplete,
    onOpenChange,
    onRecordingStart,
    onReviewReady,
    retainNativeSourceAfterComplete,
    reviewBeforeUpload,
  };

  const owner = useMemo<NativeJournalVideoCaptureOwner | undefined>(() => {
    if (nativeCaptureContext?.userId) {
      return {
        userId: nativeCaptureContext.userId,
        entryId: nativeCaptureContext.entryId,
      };
    }
    if (!recovery?.userId) return undefined;
    return { userId: recovery.userId, entryId: recovery.entryId };
  }, [
    nativeCaptureContext?.entryId,
    nativeCaptureContext?.userId,
    recovery?.entryId,
    recovery?.userId,
  ]);
  const ownerKey = `${owner?.userId ?? ""}:${owner?.entryId ?? ""}`;

  useEffect(() => {
    if (!open) return;
    return acquireNativeDarkStatusSurface();
  }, [open]);

  const closeAndKeepDraft = useCallback(() => {
    abortRef.current?.abort();
    callbacksRef.current.onOpenChange(false);
  }, []);

  const acknowledgeAfterDurableSave = useCallback(async (sessionId: string) => {
    if (!sessionId || callbacksRef.current.retainNativeSourceAfterComplete) return;
    try {
      await acknowledgeNativeJournalVideoQueued(sessionId);
    } catch (ackError) {
      // The browser queue is already canonical. Keeping the native source is a
      // safe cleanup failure; the stable session id prevents remote duplicates.
      console.warn("[journal-video-native] queued video acknowledgement failed:", ackError);
    }
  }, []);

  const saveResult = useCallback(
    async (review: PendingReview) => {
      setSaveError(null);
      setPhase("saving");
      try {
        await callbacksRef.current.onComplete(review.result, review.durationMs);
        await acknowledgeAfterDurableSave(review.result.nativeCaptureId ?? review.result.recoveryDraftId ?? "");
        setPendingReview(null);
        callbacksRef.current.onOpenChange(false);
      } catch (saveFailure) {
        setPhase("review");
        setSaveError(errorMessage(saveFailure) || "Couldn't save this video yet.");
      }
    },
    [acknowledgeAfterDurableSave],
  );

  useEffect(() => {
    if (!open || defaultMode === "screen") return;
    if (pendingReview) {
      setPhase("review");
      return;
    }
    let disposed = false;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    if (bootstrapOwnerKeyRef.current !== ownerKey) {
      bootstrapOwnerKeyRef.current = ownerKey;
      bootstrapRef.current = null;
    }

    setError(null);
    setSaveError(null);
    setPhase("starting");

    const observeCapture = (update: NativeJournalVideoCaptureSnapshot) => {
      if (disposed) return;
      activeSessionIdRef.current = update.sessionId;
      setCapture(update);
      setPhase(phaseForCapture(update));
      if (
        update.state === "interrupted" &&
        /saved as a draft to finish later/i.test(update.interruptionReason ?? "")
      ) {
        controller.abort();
        callbacksRef.current.onOpenChange(false);
        return;
      }
      if (
        update.state === "recording" &&
        recordingStartSessionRef.current !== update.sessionId
      ) {
        recordingStartSessionRef.current = update.sessionId;
        callbacksRef.current.onRecordingStart?.();
      }
    };

    const bootstrap = () => {
      if (bootstrapRef.current) return bootstrapRef.current;
      bootstrapRef.current = (async () => {
        if (!owner?.userId || !owner.entryId) {
          throw new Error("A signed-in journal entry is required for native video recovery.");
        }
        const pending = await findPendingNativeJournalVideoCapture(owner);
        if (pending?.isActiveSession) {
          return resumeNativeJournalVideoCapture(pending.sessionId);
        }
        if (pending) return pending;

        const sessionId = createNativeJournalVideoSessionId();
        const started = await startNativeJournalVideoCapture({
          sessionId,
          userId: owner.userId,
          entryId: owner.entryId,
          anchorOffset: nativeCaptureContext?.anchorOffset ?? recovery?.anchorOffset ?? 0,
          maxDurationMs: JOURNAL_VIDEO_MAX_DURATION_MS,
          maxBytes: JOURNAL_VIDEO_RECORD_STOP_BYTES,
          teleprompter: teleprompter?.trim() || "",
        });
        return started;
      })().catch((bootstrapError) => {
        bootstrapRef.current = null;
        throw bootstrapError;
      });
      return bootstrapRef.current;
    };

    const run = async () => {
      try {
        const started = await bootstrap();
        if (disposed) return;
        observeCapture(started);

        const ready = await waitForNativeJournalVideoCaptureReady(started.sessionId, {
          signal: controller.signal,
          onUpdate: observeCapture,
        });
        if (disposed) return;
        setCapture(ready);
        setPhase("materializing");
        const video = await readNativeJournalVideoBlob(ready, fetch, controller.signal);
        if (isJournalVideoUploadTooLarge(video.size)) {
          throw new Error(journalVideoUploadTooLargeMessage(ready.durationMs ?? 0, video.size));
        }
        const result = buildNativeJournalVideoCaptureResult(ready, video);
        const review = { result, durationMs: result.durationMs };
        if (disposed) return;
        callbacksRef.current.onReviewReady?.(result, result.durationMs);
        if (callbacksRef.current.reviewBeforeUpload) {
          setPendingReview(review);
          setPhase("review");
        } else {
          setPendingReview(review);
          await saveResult(review);
        }
      } catch (runError) {
        if (disposed || controller.signal.aborted) return;
        if (runError instanceof NativeJournalVideoCaptureCancelledError) {
          callbacksRef.current.onOpenChange(false);
          return;
        }
        setPhase("error");
        setError(errorMessage(runError));
      }
    };

    void run();
    return () => {
      disposed = true;
      controller.abort();
      if (abortRef.current === controller) abortRef.current = null;
    };
  }, [
    defaultMode,
    nativeCaptureContext?.anchorOffset,
    nativeCaptureContext?.entryId,
    nativeCaptureContext?.userId,
    open,
    owner,
    ownerKey,
    pendingReview,
    recovery?.anchorOffset,
    recovery?.entryId,
    recovery?.userId,
    restartKey,
    saveResult,
    teleprompter,
  ]);

  useEffect(() => {
    if (!open || defaultMode === "screen") return;
    let handle: PluginListenerHandle | undefined;
    let disposed = false;
    void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      const sessionId = activeSessionIdRef.current;
      if (!isActive || !sessionId) return;
      void resumeNativeJournalVideoCapture(sessionId)
        .then((resumed) => {
          if (disposed || activeSessionIdRef.current !== resumed.sessionId) return;
          setCapture(resumed);
          setPhase(phaseForCapture(resumed));
        })
        .catch((resumeError) => {
          if (!disposed) {
            console.warn("[journal-video-native] foreground reattachment failed:", resumeError);
          }
        });
    }).then((registered) => {
      if (disposed) {
        void registered.remove();
        return;
      }
      handle = registered;
    });
    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [defaultMode, open]);

  const handleResume = async () => {
    if (!capture?.sessionId) return;
    setError(null);
    try {
      const resumed = await resumeNativeJournalVideoCapture(capture.sessionId);
      setCapture(resumed);
      setPhase(phaseForCapture(resumed));
      setRestartKey((value) => value + 1);
    } catch (resumeError) {
      setPhase("interrupted");
      setError(errorMessage(resumeError));
    }
  };

  const handleRetake = async () => {
    const sessionId = pendingReview?.result.nativeCaptureId ?? capture?.sessionId;
    if (!sessionId) return;
    setError(null);
    setSaveError(null);
    setPhase("starting");
    try {
      abortRef.current?.abort();
      await discardNativeJournalVideoCapture(sessionId);
      bootstrapRef.current = null;
      activeSessionIdRef.current = null;
      setCapture(null);
      setPendingReview(null);
      setRestartKey((value) => value + 1);
    } catch (discardError) {
      setPhase(pendingReview ? "review" : "error");
      setError(`Couldn't discard the old recording: ${errorMessage(discardError)}`);
    }
  };

  const confirming = phase === "saving" || uploading || transcribing;
  const durationMs = capture?.durationMs ?? 0;
  const byteSize = capture?.byteSize ?? 0;
  const interrupted = phase === "interrupted";
  const busy =
    phase === "starting" ||
    phase === "capturing" ||
    phase === "finalizing" ||
    phase === "materializing";

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (phase === "saving") return;
    closeAndKeepDraft();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideCloseButton className="inset-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none p-0 lg:left-1/2 lg:top-1/2 lg:h-auto lg:max-h-[90dvh] lg:max-w-3xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Native video journal</DialogTitle>
          <DialogDescription>Record securely with the iPhone camera.</DialogDescription>
        </DialogHeader>

        {pendingReview ? (
          <JournalVideoCaptureReview
            result={pendingReview.result}
            durationMs={pendingReview.durationMs}
            onRetake={() => void handleRetake()}
            onConfirm={() => void saveResult(pendingReview)}
            onKeepForLater={closeAndKeepDraft}
            confirming={confirming}
            confirmLabel={confirmLabel}
            reviewHint={reviewHint}
            saveError={saveError}
            className="h-full lg:h-auto"
          />
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-5 bg-black px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(4rem,env(safe-area-inset-top))] text-center text-white lg:min-h-[28rem] lg:rounded-lg">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={closeAndKeepDraft}
              aria-label="Close and keep recording safe"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
              {phase === "error" ? (
                <AlertTriangle className="h-9 w-9 text-amber-300" />
              ) : busy ? (
                <Loader2 className="h-9 w-9 animate-spin text-white/80" />
              ) : (
                <Video className="h-9 w-9 text-white/80" />
              )}
            </div>

            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-semibold">
                {phase === "starting"
                  ? "Opening the iPhone camera…"
                  : phase === "capturing"
                    ? "Recording in the iPhone camera"
                    : phase === "interrupted"
                      ? "Recording safely paused"
                      : phase === "finalizing"
                        ? "Securing your recording…"
                        : phase === "materializing"
                          ? "Preparing your review…"
                          : "Your recording is still on this iPhone"}
              </h2>
              <p className="text-sm text-white/70">
                {interrupted
                  ? "A call or app interruption paused capture. Resume when you're ready, or close and return later."
                  : phase === "error"
                    ? error || "The native recording needs another attempt to open."
                    : "The original stays in protected app storage until this video reaches the durable upload queue."}
              </p>
            </div>

            {capture ? (
              <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm tabular-nums text-white/80">
                <span>{formatJournalVideoClock(durationMs)}</span>
                <span aria-hidden>·</span>
                <span>
                  {formatJournalVideoSizeMb(byteSize, 1)}/
                  {formatJournalVideoSizeMb(JOURNAL_VIDEO_MAX_UPLOAD_BYTES, 0)}
                </span>
              </div>
            ) : null}

            {error && phase !== "error" ? (
              <p className="max-w-md rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                {error}
              </p>
            ) : null}

            <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
              {(interrupted || phase === "error") && capture?.canResume ? (
                <Button type="button" className="min-h-11" onClick={() => void handleResume()}>
                  Resume recording
                </Button>
              ) : null}
              {phase === "error" ? (
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => setRestartKey((value) => value + 1)}
                >
                  Try recovery again
                </Button>
              ) : null}
              {(interrupted || phase === "error") && capture?.sessionId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void handleRetake()}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Discard and retake
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default NativeJournalVideoCaptureDialog;
