import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import ArtifactMobileInsightExplorePanel from "./ArtifactMobileInsightExplorePanel";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";

const claim: RenderClaimCardClaim = {
  id: "claim-1",
  claim: "King Solomon had wisdom and power.",
  tone: "neutral",
  doctrine_tags: ["old testament figures"],
  scripture_supports: [],
  scripture_challenges: [{ ref: "1 Kings 11:4", note: "Solomon turned away from God." }],
  match_relation: "new",
  matched_belief_id: null,
  bias_flags: ["extra-biblical source"],
  verdict: null,
};

const claimCardContext: RenderClaimCardContext = {
  isDesktop: false,
  youTubeVideoId: "abc123",
  claimSources: {
    [claim.id]: {
      id: "segment-1",
      label: "1:45",
      text: "King Solomon, as we remember from the Bible, had wisdom.",
      startSeconds: 105,
    },
  },
  matchedBeliefs: {},
  playClaimAtSource: vi.fn(),
  startClaimResearchChat: vi.fn(),
  openJournalFromClaim: vi.fn(),
  toggleResearchLater: vi.fn(),
  applyClaimVerdict: vi.fn(),
};

afterEach(() => cleanup());

describe("ArtifactMobileInsightExplorePanel", () => {
  it("uses one top header row for back navigation and claim actions", () => {
    const onBack = vi.fn();
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ArtifactMobileInsightExplorePanel
            claim={claim}
            claimIndex={1}
            claimCardContext={claimCardContext}
            onBack={onBack}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    const backButton = screen.getByRole("button", { name: "Back to study" });
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByText("Back to insights")).not.toBeInTheDocument();
    expect(backButton).toHaveTextContent("Back");

    const actionToolbars = screen.getAllByRole("toolbar", { name: "Claim actions" });
    expect(actionToolbars).toHaveLength(1);
    expect(backButton.parentElement).toContainElement(actionToolbars[0]);
    expect(within(actionToolbars[0]).getByText("Research")).toBeInTheDocument();
    expect(within(actionToolbars[0]).getByText("Reflect")).toBeInTheDocument();
    expect(within(actionToolbars[0]).getByText("Keep")).toBeInTheDocument();
    expect(within(actionToolbars[0]).getByText("Reject")).toBeInTheDocument();
  });
});
