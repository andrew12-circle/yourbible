import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MorningRitualStepPanels } from "@/components/living-hope/MorningRitualStepPanels";
import { emptyDailyAssignment, emptyThanksgivingLists } from "@/lib/livingHope/morningRitual";

describe("MorningRitualStepPanels", () => {
  it("renders the structured intro without crashing", () => {
    const thanksgiving = emptyThanksgivingLists();

    render(
      <MorningRitualStepPanels
        step={{ kind: "intro" }}
        letter={null}
        workbook={null}
        manifestoItem={null}
        storySuggestedIndex={0}
        storySelectedIndex={null}
        onStorySelectedIndexChange={vi.fn()}
        onAddStory={vi.fn()}
        storyRecall=""
        setStoryRecall={vi.fn()}
        currentGoal={null}
        touches={{}}
        setTouch={vi.fn()}
        visionRecall=""
        setVisionRecall={vi.fn()}
        metricValues={{}}
        setMetricValues={vi.fn()}
        thanksgivingNow={thanksgiving.now}
        thanksgivingNotYet={thanksgiving.notYet}
        onThanksgivingNowChange={vi.fn()}
        onThanksgivingNotYetChange={vi.fn()}
        conversationEntryId={null}
        conversationPreview={null}
        conversationBusy={false}
        conversationError={null}
        scriptureReflection=""
        setScriptureReflection={vi.fn()}
        dailyAssignment={emptyDailyAssignment()}
        setDailyAssignment={vi.fn()}
        surrender=""
        setSurrender={vi.fn()}
        covering=""
        setCovering={vi.fn()}
        scripture={null}
        scriptureBusy={false}
        scriptureError={null}
        onGenerateScripture={vi.fn()}
        journalEntryId={null}
        worshipPlaylistUrl=""
        worshipPlaylistHistory={[]}
        onWorshipMusicChange={vi.fn()}
        expressMode={false}
        onExpressModeChange={vi.fn()}
        guidedMode={false}
        onGuidedModeChange={vi.fn()}
        durationMin={15}
        onDurationChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Morning formula" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guided morning/ })).toBeInTheDocument();
  });
});
