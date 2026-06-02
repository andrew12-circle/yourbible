import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  BookOpen,
  Clock,
  FileText,
  LayoutList,
  ListOrdered,
  Menu,
  NotebookPen,
  RefreshCw,
  ScrollText,
  Sparkles,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
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

const SECTION_ICONS: Record<string, LucideIcon> = {
  overview: Sparkles,
  video: Video,
  chapters: LayoutList,
  teachings: BookOpen,
  claims: Sparkles,
  "claims-index": ListOrdered,
  capture: Bookmark,
  notes: NotebookPen,
};

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition",
          active
            ? "bg-muted font-medium text-foreground"
            : "text-foreground/90 hover:bg-muted/60",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={onClick}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            active ? "bg-background text-foreground shadow-sm ring-1 ring-border/40" : "bg-muted/45 text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-snug">{label}</span>
      </button>
    </li>
  );
}

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
        <SheetHeader className="border-b border-border/60 px-4 py-3.5 text-left">
          <SheetTitle className="font-display text-base font-semibold tracking-tight">Study menu</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {hasTranscript ? (
            <MenuSection title="View">
              <MenuItem icon={ScrollText} label="Transcript" onClick={() => run(onOpenTranscript)} />
            </MenuSection>
          ) : null}

          {sections.length > 0 ? (
            <MenuSection title="On this page">
              {sections.map((section) => {
                const Icon =
                  SECTION_ICONS[section.id] ?? (section.icon === "index" ? ListOrdered : LayoutList);
                return (
                  <MenuItem
                    key={section.id}
                    icon={Icon}
                    label={section.label}
                    active={resolvedHash === section.hash}
                    onClick={() => run(() => onNavigateSection(section.hash))}
                  />
                );
              })}
            </MenuSection>
          ) : null}

          {showCaptureActions ? (
            <MenuSection title="Capture">
              {onBookmark ? (
                <MenuItem
                  icon={Bookmark}
                  label="Bookmark current moment"
                  disabled={!canCapture || captureSaving}
                  onClick={() => run(onBookmark)}
                />
              ) : null}
              {onBelieve ? (
                <MenuItem
                  icon={Sparkles}
                  label="I believe this"
                  disabled={captureSaving}
                  onClick={() => run(onBelieve)}
                />
              ) : null}
              {onStudyJournal ? (
                <MenuItem icon={NotebookPen} label="Study journal" onClick={() => run(onStudyJournal)} />
              ) : null}
              {onOpenJournalTimestamp ? (
                <MenuItem
                  icon={Clock}
                  label="Full-page journal at current time"
                  disabled={!canCapture}
                  onClick={() => run(onOpenJournalTimestamp)}
                />
              ) : null}
              {onOpenJournalFull ? (
                <MenuItem
                  icon={BookOpen}
                  label="Full-page journal (full video)"
                  disabled={!hasTranscript}
                  onClick={() => run(onOpenJournalFull)}
                />
              ) : null}
            </MenuSection>
          ) : null}

          {showPaste || showWrapUp || showReanalyze ? (
            <MenuSection title="Artifact">
              {showPaste ? (
                <MenuItem icon={FileText} label="Paste transcript" onClick={() => run(onPaste)} />
              ) : null}
              {showWrapUp ? (
                <MenuItem icon={Sparkles} label="Wrap up studying" onClick={() => run(onWrapUp)} />
              ) : null}
              {showReanalyze ? (
                <MenuItem icon={RefreshCw} label="Re-analyze" onClick={() => run(onReanalyze)} />
              ) : null}
            </MenuSection>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
