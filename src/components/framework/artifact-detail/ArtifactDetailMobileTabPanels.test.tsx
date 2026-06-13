import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs } from "@/components/ui/tabs";
import ArtifactDetailMobileTabPanels from "./ArtifactDetailMobileTabPanels";

afterEach(() => cleanup());

describe("ArtifactDetailMobileTabPanels", () => {
  it("renders transcript tab without throwing (cn import)", () => {
    render(
      <Tabs value="transcript">
        <ArtifactDetailMobileTabPanels
          isDesktop={false}
          mobilePinnedPane
          mobileTab="transcript"
          transcriptPanel={<div data-testid="transcript-body">Transcript</div>}
          mobileJournalTabPanel={null}
          artifactId="artifact-1"
          bookmarkLabel=""
          onBookmarkLabelChange={() => {}}
          noteBody=""
          onNoteBodyChange={() => {}}
          moments={[]}
          canCaptureMoments={false}
          savingMoment={false}
          hasTranscript
          onBookmark={() => {}}
          onSaveNote={() => {}}
          onBelieve={() => {}}
          onStudyJournal={() => {}}
          onOpenJournalTimestamp={() => {}}
          onOpenJournalFull={() => {}}
          onSeekMoment={() => {}}
          noteSectionOpen={false}
          onNoteSectionOpenChange={() => {}}
        />
      </Tabs>,
    );

    expect(screen.getByTestId("transcript-body")).toBeInTheDocument();
  });
});
