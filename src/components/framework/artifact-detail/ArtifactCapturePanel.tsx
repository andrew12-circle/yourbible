import { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  NotebookPen,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { artifactInset, sectionLabel } from "@/lib/framework/artifactSurfaces";
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
  /** Expand note section (e.g. from mobile quick row). */
  noteSectionOpen?: boolean;
  onNoteSectionOpenChange?: (open: boolean) => void;
};

function MomentsInbox({
  moments,
  canCapture,
  onSeekMoment,
}: {
  moments: CaptureMoment[];
  canCapture: boolean;
  onSeekMoment: (seconds: number) => void;
}) {
  return (
    <div className="rounded-xl bg-background/50 p-3 ring-1 ring-border/40">
      <p className={cn(sectionLabel, "mb-0.5")}>Your moments</p>
      <p className="mb-2 text-[10px] text-muted-foreground">Tap to jump back.</p>
      {moments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No moments yet — mark the playhead or add a note while you watch.</p>
      ) : (
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-auto pr-0.5 md:max-h-52">
          {moments.map((moment) => (
            <button
              key={moment.id}
              type="button"
              onClick={() => onSeekMoment(moment.start_seconds)}
              disabled={!canCapture}
              className="inline-flex max-w-full flex-col items-start rounded-full border border-border/70 bg-card px-2.5 py-1 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50"
            >
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
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
  );
}

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
  noteSectionOpen: noteSectionOpenProp,
  onNoteSectionOpenChange,
}: Props) {
  const [labelOpen, setLabelOpen] = useState(Boolean(bookmarkLabel.trim()));
  const [noteOpenInternal, setNoteOpenInternal] = useState(false);
  const noteOpen = noteSectionOpenProp ?? noteOpenInternal;
  const setNoteOpen = onNoteSectionOpenChange ?? setNoteOpenInternal;

  return (
    <div className={cn("rounded-xl p-3 sm:p-4 md:p-5", artifactInset)}>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-5">
        <div className="space-y-3">
          <Button
            className="h-10 w-full font-medium"
            onClick={onBookmark}
            disabled={!canCapture || saving}
          >
            <Bookmark className="mr-2 h-4 w-4" aria-hidden />
            Mark this moment
          </Button>

          <Collapsible open={labelOpen} onOpenChange={setLabelOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-between px-2 text-xs text-muted-foreground"
              >
                {labelOpen ? "Hide label" : "Add label (optional)"}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", labelOpen && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Input
                value={bookmarkLabel}
                onChange={(e) => onBookmarkLabelChange(e.target.value)}
                placeholder="Label for your next mark…"
                disabled={!canCapture || saving}
                className="h-9 w-full min-w-0"
              />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={noteOpen} onOpenChange={setNoteOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-between px-2 text-xs text-muted-foreground"
              >
                Add note or belief
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", noteOpen && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <PolishedTextarea
                polishResetKey={polishResetKey}
                value={noteBody}
                onChange={(e) => onNoteBodyChange(e.target.value)}
                rows={3}
                placeholder="Add a note at the current moment…"
                disabled={!canCapture || saving}
                className="w-full min-w-0"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={onSaveNote}
                  disabled={!canCapture || saving || !noteBody.trim()}
                >
                  <StickyNote className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Save note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={onBelieve}
                  disabled={!canCapture || saving}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
                  I believe this
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-1.5 sm:w-auto">
                <NotebookPen className="h-3.5 w-3.5" aria-hidden />
                Journal
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(100vw-2rem,18rem)]">
              <DropdownMenuItem onClick={onStudyJournal}>Study journal (floating panel)</DropdownMenuItem>
              <DropdownMenuItem disabled={!canCapture} onClick={onOpenJournalTimestamp}>
                Full-page journal at current time
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenJournalFull} disabled={!hasTranscript}>
                Full-page journal (full video)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="md:hidden">
            <MomentsInbox moments={moments} canCapture={canCapture} onSeekMoment={onSeekMoment} />
          </div>
        </div>

        <div className="hidden md:block">
          <MomentsInbox moments={moments} canCapture={canCapture} onSeekMoment={onSeekMoment} />
        </div>
      </div>
    </div>
  );
}
