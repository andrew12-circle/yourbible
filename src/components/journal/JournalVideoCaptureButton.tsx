import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import JournalVideoCaptureDialog from "@/components/journal/JournalVideoCaptureDialog";
import { toast } from "@/hooks/use-toast";
import { insertEntryVideo, journalVideoCaptureSupported, uploadEntryVideo } from "@/lib/journal/videos";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | undefined;
  entryId: string | null;
  onAppendTranscript: (chunk: string) => void;
  onVideoSaved: () => void;
  size?: "sm" | "md";
  className?: string;
};

export default function JournalVideoCaptureButton({
  userId,
  entryId,
  onAppendTranscript,
  onVideoSaved,
  size = "sm",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const supported = journalVideoCaptureSupported();

  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnClass = size === "md" ? "h-10 w-10" : "h-8 w-8";

  const handleComplete = async (blob: Blob, durationMs: number) => {
    if (!userId || !entryId) {
      toast({ title: "Save the entry first", variant: "destructive" });
      setOpen(false);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadEntryVideo(userId, entryId, blob, durationMs);
      await insertEntryVideo(userId, entryId, uploaded);
      onVideoSaved();
      toast({ title: "Video saved to entry" });
      setOpen(false);
    } catch (e) {
      toast({
        title: "Couldn't save video",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
            onClick={() => setOpen(true)}
            aria-label="Record video journal"
          >
            <Video className={iconClass} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {!supported
            ? "Video journaling isn't supported in this browser."
            : !entryId
              ? "Open an entry to record video"
              : "Record yourself — live transcription while you talk"}
        </TooltipContent>
      </Tooltip>

      <JournalVideoCaptureDialog
        open={open}
        onOpenChange={setOpen}
        onAppendTranscript={onAppendTranscript}
        onComplete={handleComplete}
        uploading={uploading}
      />
    </>
  );
}
