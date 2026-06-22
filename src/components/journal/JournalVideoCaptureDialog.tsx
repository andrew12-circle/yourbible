import { useCallback, useEffect, useRef } from "react";
import { Loader2, Square, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import { useJournalVideoCapture } from "@/hooks/useJournalVideoCapture";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppendTranscript: (chunk: string) => void;
  onComplete: (blob: Blob, durationMs: number) => void | Promise<void>;
  uploading?: boolean;
};

export default function JournalVideoCaptureDialog({
  open,
  onOpenChange,
  onAppendTranscript,
  onComplete,
  uploading = false,
}: Props) {
  const recordStartedAtRef = useRef(0);
  const bindPreviewRef = useRef<(el: HTMLVideoElement | null) => void>(() => {});

  const capture = useJournalVideoCapture({ onAppendTranscript });
  const openPreviewRef = useRef(capture.openPreview);
  const cancelRef = useRef(capture.cancel);
  openPreviewRef.current = capture.openPreview;
  cancelRef.current = capture.cancel;
  bindPreviewRef.current = capture.bindPreview;

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    bindPreviewRef.current(el);
  }, []);

  useEffect(() => {
    void openPreviewRef.current();
    return () => cancelRef.current();
  }, []);

  const handleClose = () => {
    capture.cancel();
    onOpenChange(false);
  };

  const handleStart = () => {
    recordStartedAtRef.current = Date.now();
    capture.startRecording();
  };

  const handleStop = async () => {
    const started = recordStartedAtRef.current;
    const blob = await capture.stopRecording();
    if (!blob) {
      onOpenChange(false);
      return;
    }
    const durationMs = Math.max(0, Date.now() - started);
    await onComplete(blob, durationMs);
  };

  const recording = capture.phase === "recording";
  const processing = capture.phase === "processing" || uploading;
  const ready = capture.phase === "preview" || recording;
  const starting = open && capture.phase === "idle" && !capture.error;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-lg",
          "max-sm:fixed max-sm:inset-0 max-sm:h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Video journal</DialogTitle>
          <DialogDescription>
            Record yourself talking — your words appear as you speak, like voice-to-text.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-[50vh] flex-1 flex-col bg-black sm:min-h-[420px]">
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "h-full min-h-[50vh] w-full flex-1 object-cover sm:min-h-[420px]",
              "[transform:scaleX(-1)]",
              !ready && "invisible",
            )}
          />

          {starting ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Loader2 className="h-8 w-8 animate-spin text-white/80" />
              <p className="text-sm text-white/70">Connecting camera…</p>
            </div>
          ) : null}

          {recording ? (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden />
              Recording
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
                  onClick={() => void capture.openPreview()}
                >
                  Try again
                </Button>
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-4">
              {processing ? (
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving video…
                </div>
              ) : recording ? (
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
              ) : ready ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-14 gap-2 rounded-full px-6"
                  onClick={handleStart}
                  aria-label="Start recording"
                >
                  <Video className="h-5 w-5" />
                  Record
                </Button>
              ) : null}
            </div>

            <p className="mt-3 text-center text-xs text-white/60">
              {recording
                ? "Talk naturally — text transcribes as you speak. Tap stop when done."
                : "See yourself like a mirror. Your recording saves to this entry."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
