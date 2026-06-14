import { type ReactNode } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import ArtifactMobileNotesTab from "@/components/framework/artifact-detail/ArtifactMobileNotesTab";
import MobileAppDock from "@/components/navigation/MobileAppDock";
import {
  artifactMobileTabPanelShell,
  artifactMobileTabScrollPane,
} from "@/lib/framework/artifactLayoutCss";
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
  mobileTab,
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
  | "mobileInsightExploreOpen"
  | "onStudyClick"
  | "onTranscriptClick"
  | "onJournalClick"
  | "onMenuClick"
  | "onHomeClick"
>) {
  if (isDesktop) return null;

  const showPinnedTabPanels = mobilePinnedPane && mobileTab !== "study";

  return (
    <div
      className={cn(
        showPinnedTabPanels && "flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col overflow-hidden",
      )}
    >
      <TabsContent
        value="transcript"
        id="transcript"
        className={cn(
          "mt-0 focus-visible:outline-none data-[state=inactive]:hidden",
          mobilePinnedPane
            ? cn(artifactMobileTabPanelShell, "data-[state=active]:flex")
            : "flex min-h-0 flex-1 flex-col",
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
          className={cn(
            "mt-0 focus-visible:outline-none data-[state=inactive]:hidden",
            artifactMobileTabScrollPane,
            "data-[state=active]:flex",
          )}
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
            className="pb-0"
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
  secondaryTabLabel?: string;
  secondaryTabIcon?: import("lucide-react").LucideIcon;
};

export function ArtifactDetailMobileAppDock({
  visible,
  insightExploreOpen,
  mobileTab,
  journalActive,
  anchor = "viewport",
  layoutRootSelector,
  secondaryTabLabel,
  secondaryTabIcon,
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
      secondaryTabLabel={secondaryTabLabel}
      secondaryTabIcon={secondaryTabIcon}
      onStudyClick={onStudyClick}
      onTranscriptClick={onTranscriptClick}
      onJournalClick={onJournalClick}
      onMenuClick={onMenuClick}
      onHomeClick={onHomeClick}
    />
  );
}
