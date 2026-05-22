import ArtifactCapturePanel, {
  type CaptureMoment,
} from "@/components/framework/artifact-detail/ArtifactCapturePanel";
import { artifactPremiumCard } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  artifactId: string;
  bookmarkLabel: string;
  onBookmarkLabelChange: (v: string) => void;
  noteBody: string;
  onNoteBodyChange: (v: string) => void;
  moments: CaptureMoment[];
  canCapture: boolean;
  saving: boolean;
  hasTranscript: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onBelieve: () => void;
  onStudyJournal: () => void;
  onOpenJournalTimestamp: () => void;
  onOpenJournalFull: () => void;
  onSeekMoment: (seconds: number) => void;
  noteSectionOpen?: boolean;
  onNoteSectionOpenChange?: (open: boolean) => void;
  className?: string;
};

export default function ArtifactMobileNotesTab({
  artifactId,
  bookmarkLabel,
  onBookmarkLabelChange,
  noteBody,
  onNoteBodyChange,
  moments,
  canCapture,
  saving,
  hasTranscript,
  onBookmark,
  onSaveNote,
  onBelieve,
  onStudyJournal,
  onOpenJournalTimestamp,
  onOpenJournalFull,
  onSeekMoment,
  noteSectionOpen,
  onNoteSectionOpenChange,
  className,
}: Props) {
  return (
    <div
      id="notes"
      className={cn(
        "mt-0 px-3 pb-8 focus-visible:outline-none sm:px-4",
        "bg-gradient-to-b from-background via-background to-muted/15",
        className,
      )}
    >
      <div className={cn(artifactPremiumCard, "p-4")}>
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Notes & capture
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bookmark the playhead, save notes, and review captured moments while you watch.
        </p>
        <div className="mt-4">
          <ArtifactCapturePanel
            bookmarkLabel={bookmarkLabel}
            onBookmarkLabelChange={onBookmarkLabelChange}
            noteBody={noteBody}
            onNoteBodyChange={onNoteBodyChange}
            polishResetKey={artifactId}
            moments={moments}
            canCapture={canCapture}
            saving={saving}
            onBookmark={onBookmark}
            onSaveNote={onSaveNote}
            onBelieve={onBelieve}
            onStudyJournal={onStudyJournal}
            onOpenJournalTimestamp={onOpenJournalTimestamp}
            onOpenJournalFull={onOpenJournalFull}
            onSeekMoment={onSeekMoment}
            hasTranscript={hasTranscript}
            noteSectionOpen={noteSectionOpen}
            onNoteSectionOpenChange={onNoteSectionOpenChange}
          />
        </div>
      </div>
    </div>
  );
}
