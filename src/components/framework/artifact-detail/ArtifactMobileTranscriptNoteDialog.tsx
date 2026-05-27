import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactId: string;
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  canCapture: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
};

export default function ArtifactMobileTranscriptNoteDialog({
  open,
  onOpenChange,
  artifactId,
  noteBody,
  onNoteBodyChange,
  canCapture,
  saving,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Note at playhead</DialogTitle>
          <DialogDescription>
            Saves a timestamped note for this video. Use the bookmark on a transcript line to capture an exact quote.
          </DialogDescription>
        </DialogHeader>
        <PolishedTextarea
          polishResetKey={artifactId}
          value={noteBody}
          onChange={(e) => onNoteBodyChange(e.target.value)}
          rows={4}
          placeholder="Add a note at the current moment…"
          disabled={!canCapture || saving}
          className="w-full min-w-0"
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onSave().then(() => onOpenChange(false))}
            disabled={!canCapture || saving || !noteBody.trim()}
          >
            {saving ? "Saving…" : "Save note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
