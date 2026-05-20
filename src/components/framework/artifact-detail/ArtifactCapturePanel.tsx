import {
  Bookmark,
  MoreHorizontal,
  NotebookPen,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { artifactInset, artifactScrollMt, sectionLabel } from "@/lib/framework/artifactSurfaces";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

export type CaptureMoment = {
  id: string;
  start_seconds: number;
  kind: string;
  label: string | null;
  body: string | null;
};

type Props = {
  bookmarkLabel: string;
  onBookmarkLabelChange: (v: string) => void;
  noteBody: string;
  onNoteBodyChange: (v: string) => void;
  polishResetKey: string;
  moments: CaptureMoment[];
  canCapture: boolean;
  saving: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onBelieve: () => void;
  onStudyJournal: () => void;
  onOpenJournalTimestamp: () => void;
  onOpenJournalFull: () => void;
  onSeekMoment: (seconds: number) => void;
  hasTranscript: boolean;
};

export default function ArtifactCapturePanel({
  bookmarkLabel,
  onBookmarkLabelChange,
  noteBody,
  onNoteBodyChange,
  polishResetKey,
  moments,
  canCapture,
  saving,
  onBookmark,
  onSaveNote,
  onBelieve,
  onStudyJournal,
  onOpenJournalTimestamp,
  onOpenJournalFull,
  onSeekMoment,
  hasTranscript,
}: Props) {
  return (
    <div
      id="capture"
      className={cn(artifactScrollMt, "mt-5 rounded-xl p-4 sm:p-5", artifactInset)}
    >
      <div className="mb-4 border-b border-border/40 pb-3">
        <h3 className="font-display text-sm font-normal text-foreground sm:text-base">Capture while watching</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bookmarks, notes, and belief seeds — timestamps follow seeks and chapter jumps.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={bookmarkLabel}
              onChange={(e) => onBookmarkLabelChange(e.target.value)}
              placeholder="Optional bookmark label"
              disabled={!canCapture || saving}
              className="h-9"
            />
            <Button
              variant="outline"
              className="h-9 shrink-0"
              onClick={onBookmark}
              disabled={!canCapture || saving}
            >
              <Bookmark className="mr-1 h-3.5 w-3.5" aria-hidden />
              Bookmark
            </Button>
          </div>
          <PolishedTextarea
            polishResetKey={polishResetKey}
            value={noteBody}
            onChange={(e) => onNoteBodyChange(e.target.value)}
            rows={3}
            placeholder="Add a note at the current moment…"
            disabled={!canCapture || saving}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              onClick={onSaveNote}
              disabled={!canCapture || saving || !noteBody.trim()}
            >
              <StickyNote className="mr-1 h-3.5 w-3.5" aria-hidden />
              Save note
            </Button>
            <Button size="sm" variant="outline" onClick={onBelieve} disabled={!canCapture || saving}>
              <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
              I believe this
            </Button>
            <Button size="sm" variant="secondary" onClick={onStudyJournal}>
              <NotebookPen className="mr-1 h-3.5 w-3.5" aria-hidden />
              Study journal
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[min(100vw-2rem,18rem)]">
                <DropdownMenuItem disabled={!canCapture} onClick={onOpenJournalTimestamp}>
                  Open full-page journal with timestamp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenJournalFull} disabled={!hasTranscript}>
                  Open full-page journal (full video)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="min-h-[8rem] rounded-xl bg-background/50 p-3 ring-1 ring-border/40">
          <p className={cn(sectionLabel, "mb-2")}>Saved moments</p>
          {moments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No moments yet — bookmark or note while you watch.</p>
          ) : (
            <div className="flex max-h-52 flex-wrap gap-1.5 overflow-auto pr-0.5">
              {moments.map((moment) => (
                <button
                  key={moment.id}
                  type="button"
                  onClick={() => onSeekMoment(moment.start_seconds)}
                  disabled={!canCapture}
                  className="inline-flex max-w-full flex-col items-start rounded-full border border-border/70 bg-card px-2.5 py-1 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50"
                >
                  <span className="font-mono tabular-nums text-[10px] text-muted-foreground">
                    {formatTranscriptClock(moment.start_seconds)}
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {moment.label || moment.body || moment.kind.replace("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
