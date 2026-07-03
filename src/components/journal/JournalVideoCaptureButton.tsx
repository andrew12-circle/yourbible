import { useRef, useState } from "react";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import JournalVideoCaptureDialog from "@/components/journal/JournalVideoCaptureDialog";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import { toast } from "@/hooks/use-toast";
import { journalVideoCaptureSupported, journalVideoTranscriptEmptyMessage } from "@/lib/journal/videos";
import { enqueueJournalVideoUpload } from "@/lib/journal/journalVideoUploadQueue";
import { saveJournalVideoCapture } from "@/lib/journal/journalVideoUploadProcessor";
import { clearInProgressJournalVideoRecording } from "@/lib/journal/journalVideoRecordingRecovery";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | undefined;
  entryId: string | null;
  getAnchorOffset: () => number;
  onVideoSaved: (payload: {
    transcript: string;
    anchorOffset: number;
    liveTranscript?: string;
    peakLiveTranscript?: string;
  }) => void;
  onRecordingStart?: () => void;
  onLiveTranscript?: (text: string) => void;
  onRecordingCancelled?: () => void;
  size?: "sm" | "md";
  className?: string;
};

export default function JournalVideoCaptureButton({
  userId,
  entryId,
  getAnchorOffset,
  onVideoSaved,
  onRecordingStart,
  onLiveTranscript,
  onRecordingCancelled,
  size = "sm",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const anchorRef = useRef(0);
  const supported = journalVideoCaptureSupported();

  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnClass = size === "md" ? "h-10 w-10" : "h-8 w-8";

  const snapAnchor = () => {
    anchorRef.current = getAnchorOffset();
  };

  const openCapture = () => {
    snapAnchor();
    setOpen(true);
  };

  const handleComplete = async (result: JournalVideoCaptureResult, durationMs: number) => {
    if (!userId || !entryId) {
      toast({ title: "Save the entry first", variant: "destructive" });
      setOpen(false);
      return;
    }
    const anchorOffset = anchorRef.current;
    const recordedMs = result.durationMs || durationMs;
    setUploading(true);
    try {
      const saved = await saveJournalVideoCapture(
        userId,
        entryId,
        result.video,
        result.audio,
        recordedMs,
        anchorOffset,
        result.liveTranscript,
        result.chapters,
        result.peakLiveTranscript,
      );

      onVideoSaved(saved);
      void clearInProgressJournalVideoRecording(result.recoveryDraftId);
      toast({
        title: saved.transcript ? "Video and transcript saved" : "Video saved",
        description: saved.transcript
          ? undefined
          : journalVideoTranscriptEmptyMessage({
              sttError: saved.sttError,
              hadLiveCaption: Boolean(
                result.liveTranscript.trim() || result.peakLiveTranscript.trim(),
              ),
              hadAudioSidecar: Boolean(result.audio && result.audio.size > 0),
            }),
      });
      setOpen(false);
    } catch (e) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline || /network|fetch|failed/i.test(e instanceof Error ? e.message : "")) {
        try {
          await enqueueJournalVideoUpload(
            {
              id: crypto.randomUUID(),
              userId,
              entryId,
              anchorOffset,
              durationMs: recordedMs,
              liveTranscript: result.liveTranscript,
              createdAt: new Date().toISOString(),
            },
            result.video,
            result.audio,
            result.chapters,
          );
          void clearInProgressJournalVideoRecording(result.recoveryDraftId);
          toast({
            title: "Video queued for upload",
            description: "We'll retry when you're back online.",
          });
          setOpen(false);
          return;
        } catch {
          /* fall through */
        }
      }
      toast({
        title: "Couldn't save video",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setOpen(false);
    } finally {
      setUploading(false);
      setTranscribing(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!supported || !entryId}
            className={cn(
              btnClass,
              "shrink-0 text-muted-foreground hover:text-foreground",
              className,
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              snapAnchor();
            }}
            onClick={openCapture}
            aria-label="Record video"
            title="Record video"
          >
            <Film className={iconClass} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {!supported
            ? "Video journaling isn't supported in this browser."
            : !entryId
              ? "Open an entry to record video"
              : "Record video — camera or screen share"}
        </TooltipContent>
      </Tooltip>

      {open ? (
        <JournalVideoCaptureDialog
          open={open}
          onOpenChange={(next) => {
            if (!next && !uploading && !transcribing) {
              onRecordingCancelled?.();
            }
            setOpen(next);
          }}
          onComplete={handleComplete}
          uploading={uploading}
          transcribing={transcribing}
          defaultMode="camera"
          onRecordingStart={onRecordingStart}
          onLiveTranscript={onLiveTranscript}
          recovery={
            userId && entryId
              ? { userId, entryId, anchorOffset: anchorRef.current }
              : undefined
          }
          reviewBeforeUpload
        />
      ) : null}
    </>
  );
}
