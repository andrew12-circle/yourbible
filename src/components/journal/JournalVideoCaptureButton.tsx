import { useRef, useState } from "react";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import JournalVideoCaptureDialog from "@/components/journal/JournalVideoCaptureDialog";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import { toast } from "@/hooks/use-toast";
import {
  insertEntryVideo,
  journalVideoCaptureSupported,
  journalVideoTranscriptEmptyMessage,
  transcribeJournalVideo,
  updateEntryVideoTranscript,
  uploadEntryVideo,
} from "@/lib/journal/videos";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | undefined;
  entryId: string | null;
  getAnchorOffset: () => number;
  onVideoSaved: (payload: { transcript: string; anchorOffset: number }) => void;
  size?: "sm" | "md";
  className?: string;
};

export default function JournalVideoCaptureButton({
  userId,
  entryId,
  getAnchorOffset,
  onVideoSaved,
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
    setOpen(true);
  };

  const handleComplete = async (result: JournalVideoCaptureResult, durationMs: number) => {
    if (!userId || !entryId) {
      toast({ title: "Save the entry first", variant: "destructive" });
      setOpen(false);
      return;
    }
    const anchorOffset = anchorRef.current;
    setUploading(true);
    try {
      const uploaded = await uploadEntryVideo(userId, entryId, result.video, durationMs);
      const row = await insertEntryVideo(userId, entryId, uploaded, { anchor_offset: anchorOffset });
      if (!row) throw new Error("Could not attach video to entry");

      setUploading(false);
      setTranscribing(true);
      const stt = await transcribeJournalVideo(uploaded.storage_path, {
        userId,
        audioBlob: result.audio,
        liveTranscript: result.liveTranscript,
      });
      const transcript = stt.text;
      if (transcript) {
        await updateEntryVideoTranscript(row.id, transcript);
      }

      onVideoSaved({ transcript, anchorOffset });
      toast({
        title: transcript ? "Video and transcript saved" : "Video saved",
        description: transcript
          ? undefined
          : journalVideoTranscriptEmptyMessage({
              sttError: stt.error,
              hadLiveCaption: Boolean(result.liveTranscript.trim()),
              hadAudioSidecar: Boolean(result.audio && result.audio.size > 0),
            }),
      });
      setOpen(false);
    } catch (e) {
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
          onOpenChange={setOpen}
          onComplete={handleComplete}
          uploading={uploading}
          transcribing={transcribing}
          defaultMode="camera"
        />
      ) : null}
    </>
  );
}
