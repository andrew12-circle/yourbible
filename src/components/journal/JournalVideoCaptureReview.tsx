import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import { pickBestVideoJournalTranscript } from "@/lib/journal/journalVideoBody";
import { captureVideoThumbnail } from "@/lib/journal/journalVideoThumbnail";
import { cn } from "@/lib/utils";

type Props = {
  result: JournalVideoCaptureResult;
  durationMs: number;
  onRetake: () => void;
  onConfirm: () => void;
  onKeepForLater?: () => void;
  confirming?: boolean;
  confirmLabel?: string;
  reviewHint?: string;
  saveError?: string | null;
  className?: string;
};

export function JournalVideoCaptureReview({
  result,
  durationMs,
  onRetake,
  onConfirm,
  onKeepForLater,
  confirming = false,
  confirmLabel = "Save video",
  reviewHint,
  saveError,
  className,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [previewAspectRatio, setPreviewAspectRatio] = useState(16 / 9);

  useEffect(() => {
    const url = URL.createObjectURL(result.video);
    setPreviewUrl(url);
    setPreviewAspectRatio(16 / 9);
    void captureVideoThumbnail(result.video, 0.5).then(setPoster);
    return () => URL.revokeObjectURL(url);
  }, [result.video]);

  const clock = formatClock(durationMs);
  const previewTranscript = pickBestVideoJournalTranscript(
    result.liveTranscript,
    result.peakLiveTranscript,
  );
  const portraitPreview = previewAspectRatio < 1;

  return (
    <div
      className={cn(
        "flex max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-background",
        "sm:max-h-[min(90dvh,48rem)]",
        className,
      )}
    >
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]",
          "pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3",
          "sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] sm:pt-6 sm:pb-4",
        )}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-semibold">Review your recording</p>
            <p className="text-sm text-muted-foreground">
              {clock} ·{" "}
              {result.chapters.length
                ? `${result.chapters.length} chapter markers`
                : "Retake or save when ready"}
            </p>
            {reviewHint ? <p className="mt-1 text-sm text-foreground">{reviewHint}</p> : null}
          </div>

          <div
            data-testid="video-review-frame"
            className={cn(
              "relative mx-auto overflow-hidden rounded-lg bg-black",
              portraitPreview
                ? "h-[min(56dvh,32rem)] w-auto max-w-full"
                : "w-full max-h-[min(56dvh,32rem)]",
            )}
            style={{ aspectRatio: String(previewAspectRatio) }}
          >
            {previewUrl ? (
              <video
                src={previewUrl}
                poster={poster ?? undefined}
                controls
                playsInline
                onLoadedMetadata={(event) => {
                  const { videoWidth, videoHeight } = event.currentTarget;
                  if (videoWidth > 0 && videoHeight > 0) {
                    setPreviewAspectRatio(videoWidth / videoHeight);
                  }
                }}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {previewTranscript ? (
            <p className="line-clamp-3 text-sm italic text-muted-foreground">
              &ldquo;{previewTranscript}&rdquo;
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t bg-background/95 pt-3 backdrop-blur",
          "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]",
          "pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          "sm:border-t-0 sm:bg-background sm:pt-0 sm:backdrop-blur-none",
          "sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]",
        )}
      >
        {saveError ? (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {saveError} Your recording is still here. Tap {confirmLabel} to retry.
          </p>
        ) : null}
        {onKeepForLater ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full"
            onClick={onKeepForLater}
            disabled={confirming}
          >
            Keep for later
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 min-w-0"
            onClick={onRetake}
            disabled={confirming}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake
          </Button>
          <Button
            type="button"
            className="min-h-11 min-w-0"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
