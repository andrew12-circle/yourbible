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
  confirming?: boolean;
  confirmLabel?: string;
  reviewHint?: string;
  className?: string;
};

export function JournalVideoCaptureReview({
  result,
  durationMs,
  onRetake,
  onConfirm,
  confirming = false,
  confirmLabel = "Save video",
  reviewHint,
  className,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(result.video);
    setPreviewUrl(url);
    void captureVideoThumbnail(result.video, 0.5).then(setPoster);
    return () => URL.revokeObjectURL(url);
  }, [result.video]);

  const clock = formatClock(durationMs);
  const previewTranscript = pickBestVideoJournalTranscript(
    result.liveTranscript,
    result.peakLiveTranscript,
  );

  return (
    <div className={cn("flex flex-col gap-4 bg-background p-4 sm:p-6", className)}>
      <div>
        <p className="text-lg font-semibold">Review your recording</p>
        <p className="text-sm text-muted-foreground">
          {clock} · {result.chapters.length ? `${result.chapters.length} chapter markers` : "Retake or save when ready"}
        </p>
        {reviewHint ? <p className="mt-1 text-sm text-foreground">{reviewHint}</p> : null}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        {previewUrl ? (
          <video
            src={previewUrl}
            poster={poster ?? undefined}
            controls
            playsInline
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onRetake} disabled={confirming}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retake
        </Button>
        <Button type="button" onClick={onConfirm} disabled={confirming}>
          {confirming ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {confirmLabel}
        </Button>
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
