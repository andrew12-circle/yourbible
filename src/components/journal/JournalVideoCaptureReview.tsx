import { useEffect, useState } from "react";
import { Download, Loader2, RotateCcw, Upload } from "lucide-react";
import { downloadJournalVideoBackup } from "@/lib/journal/journalVideoBackup";
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
  keepForLaterLabel?: string;
  onDiscard?: () => void;
  confirming?: boolean;
  confirmLabel?: string;
  reviewHint?: string;
  saveError?: string | null;
  className?: string;
};

export function JournalVideoCaptureReview({ result, durationMs, onRetake, onConfirm, onKeepForLater, onDiscard,
  confirming = false, confirmLabel = "Save video", keepForLaterLabel = "Save and return", reviewHint, saveError, className }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [previewAspectRatio, setPreviewAspectRatio] = useState(16 / 9);
  const [discardAction, setDiscardAction] = useState<"retake" | "discard" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const url = URL.createObjectURL(result.video);
    setPreviewUrl(url);
    setPoster(null);
    setPreviewAspectRatio(16 / 9);
    setDiscardAction(null);
    setDownloadError(null);
    void captureVideoThumbnail(result.video, 0.5).then((value) => { if (!disposed) setPoster(value); }).catch(() => undefined);
    return () => { disposed = true; URL.revokeObjectURL(url); };
  }, [result.video]);

  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const transcript = pickBestVideoJournalTranscript(result.liveTranscript, result.peakLiveTranscript);
  const portrait = previewAspectRatio < 1;

  return <div className={cn("flex max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-background sm:max-h-[min(90dvh,48rem)]", className)}>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-lg font-semibold">Review your recording</p>
          <p className="text-sm text-muted-foreground">{clock} · {result.chapters.length ? `${result.chapters.length} chapter markers` : "Retake or save when ready"}</p>
          {reviewHint ? <p className="mt-1 text-sm">{reviewHint}</p> : null}
        </div>
        <div data-testid="video-review-frame" className={cn("relative mx-auto overflow-hidden rounded-lg bg-black", portrait ? "h-[min(56dvh,32rem)] w-auto max-w-full" : "w-full max-h-[min(56dvh,32rem)]")}
          style={{ aspectRatio: String(previewAspectRatio) }}>
          {previewUrl ? <video src={previewUrl} poster={poster ?? undefined} controls playsInline className="h-full w-full object-contain"
            onLoadedMetadata={(event) => { const { videoWidth, videoHeight } = event.currentTarget; if (videoWidth > 0 && videoHeight > 0) setPreviewAspectRatio(videoWidth / videoHeight); }} />
            : <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        </div>
        {transcript ? <p className="line-clamp-3 text-sm italic text-muted-foreground">&ldquo;{transcript}&rdquo;</p> : null}
        {saveError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {saveError} Your recording is still here. Tap {confirmLabel} to retry.
        </p> : null}
        {downloadError ? <p role="alert" className="text-sm text-destructive">{downloadError}</p> : null}
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" className="min-h-11 gap-2" onClick={() => {
            try { downloadJournalVideoBackup(result.video, result.recoveryDraftId ?? "recording"); }
            catch (error) { setDownloadError(error instanceof Error ? error.message : "Couldn't download this backup."); }
          }}><Download className="h-4 w-4" />Download backup</Button>
          {onKeepForLater ? <Button type="button" variant="ghost" className="min-h-11" onClick={onKeepForLater} disabled={confirming}>{keepForLaterLabel}</Button> : null}
          {onDiscard ? <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground" disabled={confirming}
            onClick={() => setDiscardAction("discard")}>Discard video</Button> : null}
        </div>
      </div>
    </div>
    <div className="sticky bottom-0 z-10 shrink-0 border-t bg-background/95 pt-3 backdrop-blur pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-6">
      {discardAction ? <div role="alert" className="space-y-2">
        <p className="text-sm">Discard this take? This cannot be undone. Save or download it first to keep a copy.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setDiscardAction(null)}>Keep recording</Button>
          <Button type="button" variant="destructive" className="min-h-11" disabled={confirming}
            onClick={() => { const action = discardAction; setDiscardAction(null); if (action === "retake") onRetake(); else onDiscard?.(); }}>
            {discardAction === "retake" ? "Discard and retake" : "Discard video"}
          </Button>
        </div>
      </div> : <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button type="button" variant="outline" className="min-h-11 min-w-0" onClick={() => setDiscardAction("retake")} disabled={confirming}>
          <RotateCcw className="mr-2 h-4 w-4" />Retake
        </Button>
        <Button type="button" className="min-h-11 min-w-0" onClick={onConfirm} disabled={confirming}>
          {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{confirmLabel}
        </Button>
      </div>}
    </div>
  </div>;
}
