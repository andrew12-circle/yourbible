import { type ReactNode } from "react";
import { TabsContent } from "@/components/ui/tabs";
import ArtifactMobileNotesTab from "@/components/framework/artifact-detail/ArtifactMobileNotesTab";
import MobileAppDock from "@/components/navigation/MobileAppDock";
import { cn } from "@/lib/utils";
import { artifactMobileDockPadding } from "@/lib/framework/artifactSurfaces";
import type { ArtifactMoment } from "@/hooks/useArtifactDetailData";

type MobileTab = "study" | "transcript" | "notes" | "journal";

type Props = {
  isDesktop: boolean;
  mobilePinnedPane: boolean;
  mobileTab: MobileTab;
  mobileInsightExploreOpen: boolean;
  transcriptPanel: ReactNode;
  mobileJournalTabPanel: ReactNode;
  artifactId: string;
  bookmarkLabel: string;
  onBookmarkLabelChange: (value: string) => void;
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  moments: ArtifactMoment[];
  canCaptureMoments: boolean;
  savingMoment: boolean;
  hasTranscript: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onBelieve: () => void;
  onStudyJournal: () => void;
  onOpenJournalTimestamp: () => void;
  onOpenJournalFull: () => void;
  onSeekMoment: (seconds: number) => void;
  noteSectionOpen: boolean;
  onNoteSectionOpenChange: (open: boolean) => void;
  onStudyClick: () => void;
  onTranscriptClick: () => void;
  onJournalClick: () => void;
  onMenuClick: () => void;
  onHomeClick: () => void;
};

export default function ArtifactDetailMobileTabPanels({
  isDesktop,
  mobilePinnedPane,
  transcriptPanel,
  mobileJournalTabPanel,
  artifactId,
  bookmarkLabel,
  onBookmarkLabelChange,
  noteBody,
  onNoteBodyChange,
  moments,
  canCaptureMoments,
  savingMoment,
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
}: Omit<
  Props,
  | "mobileTab"
  | "mobileInsightExploreOpen"
  | "onStudyClick"
  | "onTranscriptClick"
  | "onJournalClick"
  | "onMenuClick"
>) {
  if (isDesktop) return null;

  return (
    <div className={cn(mobilePinnedPane && "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col")}>
      <TabsContent
        value="transcript"
        id="transcript"
        className={cn(
          "mt-0 focus-visible:outline-none data-[state=inactive]:hidden",
          mobilePinnedPane ? cn(artifactMobileDockPadding, "pb-8") : "flex min-h-0 flex-1 flex-col",
        )}
      >
        {transcriptPanel}
      </TabsContent>

      {mobilePinnedPane ? (
        <TabsContent
          value="journal"
          className="mt-0 flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col self-stretch px-0 focus-visible:outline-none data-[state=inactive]:hidden [&>section]:min-h-0 [&>section]:flex-1"
        >
          {mobileJournalTabPanel}
        </TabsContent>
      ) : null}

      {mobilePinnedPane ? (
        <TabsContent
          value="notes"
          className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden"
        >
          <ArtifactMobileNotesTab
            artifactId={artifactId}
            bookmarkLabel={bookmarkLabel}
            onBookmarkLabelChange={onBookmarkLabelChange}
            noteBody={noteBody}
            onNoteBodyChange={onNoteBodyChange}
            moments={moments}
            canCapture={canCaptureMoments}
            saving={savingMoment}
            hasTranscript={hasTranscript}
            onBookmark={onBookmark}
            onSaveNote={onSaveNote}
            onBelieve={onBelieve}
            onStudyJournal={onStudyJournal}
            onOpenJournalTimestamp={onOpenJournalTimestamp}
            onOpenJournalFull={onOpenJournalFull}
            onSeekMoment={onSeekMoment}
            noteSectionOpen={noteSectionOpen}
            onNoteSectionOpenChange={onNoteSectionOpenChange}
          />
        </TabsContent>
      ) : null}
    </div>
  );
}

type AppDockProps = Pick<
  Props,
  | "mobileTab"
  | "onStudyClick"
  | "onTranscriptClick"
  | "onJournalClick"
  | "onMenuClick"
  | "onHomeClick"
> & {
  visible: boolean;
  insightExploreOpen: boolean;
  journalActive?: boolean;
  anchor?: "viewport" | "pane";
  layoutRootSelector?: string;
};

export function ArtifactDetailMobileAppDock({
  visible,
  insightExploreOpen,
  mobileTab,
  journalActive,
  anchor = "viewport",
  layoutRootSelector,
  onStudyClick,
  onTranscriptClick,
  onJournalClick,
  onMenuClick,
  onHomeClick,
}: AppDockProps) {
  if (!visible || insightExploreOpen) return null;

  return (
    <MobileAppDock
      anchor={anchor}
      layoutRootSelector={layoutRootSelector}
      activeTab={mobileTab}
      journalActive={journalActive}
      onStudyClick={onStudyClick}
      onTranscriptClick={onTranscriptClick}
      onJournalClick={onJournalClick}
      onMenuClick={onMenuClick}
      onHomeClick={onHomeClick}
    />
  );
}
