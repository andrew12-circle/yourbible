import { Bookmark, FileText, ListOrdered, Menu, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ArtifactNavSection } from "@/components/framework/artifact-detail/ArtifactSectionNav";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ArtifactNavSection[];
  activeHash: string;
  showPaste: boolean;
  showWrapUp: boolean;
  showReanalyze: boolean;
  hasTranscript: boolean;
  onNavigateSection: (hash: string) => void;
  onOpenTranscript: () => void;
  onPaste: () => void;
  onWrapUp: () => void;
  onReanalyze: () => void;
  /** When false, sheet is controlled externally (e.g. quick-capture More). */
  showTrigger?: boolean;
  triggerClassName?: string;
  canCapture?: boolean;
  captureSaving?: boolean;
  onBookmark?: () => void;
  onBelieve?: () => void;
  onStudyJournal?: () => void;
  onOpenJournalTimestamp?: () => void;
  onOpenJournalFull?: () => void;
};

export default function ArtifactMobileMenu({
  open,
  onOpenChange,
  sections,
  activeHash,
  showPaste,
  showWrapUp,
  showReanalyze,
  hasTranscript,
  onNavigateSection,
  onOpenTranscript,
  onPaste,
  onWrapUp,
  onReanalyze,
  showTrigger = true,
  triggerClassName,
  canCapture = true,
  captureSaving = false,
  onBookmark,
  onBelieve,
  onStudyJournal,
  onOpenJournalTimestamp,
  onOpenJournalFull,
}: Props) {
  const showCaptureActions = Boolean(
    onBookmark || onBelieve || onStudyJournal || onOpenJournalTimestamp || onOpenJournalFull,
  );
  const resolvedHash = sections.some((s) => s.hash === activeHash) ? activeHash : sections[0]?.hash;

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("h-9 w-9 shrink-0", triggerClassName)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
        </SheetTrigger>
      ) : null}
      <SheetContent side="right" className="flex w-[min(100%,320px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
          <SheetTitle className="font-display text-base font-normal">Study menu</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {hasTranscript ? (
            <div className="mb-4">
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                View
              </p>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50"
                onClick={() => run(onOpenTranscript)}
              >
                <ScrollText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Transcript
              </button>
            </div>
          ) : null}

          {sections.length > 0 ? (
            <div className="mb-4">
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-0.5">
                {sections.map((section) => {
                  const active = resolvedHash === section.hash;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                          active
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                        onClick={() => run(() => onNavigateSection(section.hash))}
                      >
                        {section.icon === "index" ? (
                          <ListOrdered className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                        ) : null}
                        {section.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {showCaptureActions ? (
            <div className="mb-4">
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Capture
              </p>
              <ul className="space-y-0.5">
                {onBookmark ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50 disabled:opacity-50"
                      disabled={!canCapture || captureSaving}
                      onClick={() => run(onBookmark)}
                    >
                      <Bookmark className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Bookmark current moment
                    </button>
                  </li>
                ) : null}
                {onBelieve ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50 disabled:opacity-50"
                      disabled={captureSaving}
                      onClick={() => run(onBelieve)}
                    >
                      <Sparkles className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      I believe this
                    </button>
                  </li>
                ) : null}
                {onStudyJournal ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50"
                      onClick={() => run(onStudyJournal)}
                    >
                      Study journal
                    </button>
                  </li>
                ) : null}
                {onOpenJournalTimestamp ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50 disabled:opacity-50"
                      disabled={!canCapture}
                      onClick={() => run(onOpenJournalTimestamp)}
                    >
                      Full-page journal at current time
                    </button>
                  </li>
                ) : null}
                {onOpenJournalFull ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50 disabled:opacity-50"
                      disabled={!hasTranscript}
                      onClick={() => run(onOpenJournalFull)}
                    >
                      Full-page journal (full video)
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {(showPaste || showWrapUp || showReanalyze) && (
            <div>
              <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Artifact
              </p>
              <ul className="space-y-0.5">
                {showPaste ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50"
                      onClick={() => run(onPaste)}
                    >
                      <FileText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Paste transcript
                    </button>
                  </li>
                ) : null}
                {showWrapUp ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50"
                      onClick={() => run(onWrapUp)}
                    >
                      <Sparkles className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Wrap up studying
                    </button>
                  </li>
                ) : null}
                {showReanalyze ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/50"
                      onClick={() => run(onReanalyze)}
                    >
                      <RefreshCw className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      Re-analyze
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
