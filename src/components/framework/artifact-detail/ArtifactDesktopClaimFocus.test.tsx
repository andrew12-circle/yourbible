import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import ArtifactDesktopClaimFocus from "./ArtifactDesktopClaimFocus";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";

const claim1: RenderClaimCardClaim = {
  id: "claim-3",
  claim: "The greatest gift the Holy Spirit gives is the ability to pray in tongues.",
  tone: "neutral",
  doctrine_tags: [],
  scripture_supports: [],
  scripture_challenges: [],
  match_relation: "new",
  matched_belief_id: null,
  bias_flags: [],
  verdict: null,
};

const claim2: RenderClaimCardClaim = {
  id: "claim-4",
  claim: "King Solomon commanded supernatural beings using a magical ring.",
  tone: "neutral",
  doctrine_tags: [],
  scripture_supports: [],
  scripture_challenges: [],
  match_relation: "new",
  matched_belief_id: null,
  bias_flags: [],
  verdict: null,
};

const claimCardContext: RenderClaimCardContext = {
  isDesktop: true,
  youTubeVideoId: "abc123",
  claimSources: {},
  matchedBeliefs: {},
  playClaimAtSource: vi.fn(),
  startClaimResearchChat: vi.fn(),
  openJournalFromClaim: vi.fn(),
  toggleResearchLater: vi.fn(),
  applyClaimVerdict: vi.fn(),
};

afterEach(() => cleanup());

describe("ArtifactDesktopClaimFocus", () => {
  it("renders inline claim review with back to claims", () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ArtifactDesktopClaimFocus
            claimId="claim-4"
            claims={[claim2]}
            claimCardContext={claimCardContext}
            onBack={vi.fn()}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Back to overview" })).toHaveTextContent("Back to overview");
    expect(screen.getByText(claim2.claim)).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Claim actions" })).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to claim 4" })).not.toBeInTheDocument();
  });

  it("shows Next to advance to the following claim card", () => {
    const onSelectClaim = vi.fn();
    const earlierClaims: RenderClaimCardClaim[] = [
      { ...claim1, id: "claim-1", claim: "Earlier claim one." },
      { ...claim1, id: "claim-2", claim: "Earlier claim two." },
    ];
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ArtifactDesktopClaimFocus
            claimId="claim-3"
            claims={[...earlierClaims, claim1, claim2]}
            claimCardContext={claimCardContext}
            onBack={vi.fn()}
            onSelectClaim={onSelectClaim}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    const nextButton = screen.getByRole("button", { name: "Go to claim 4" });
    expect(nextButton).toHaveTextContent("Next");
    fireEvent.click(nextButton);
    expect(onSelectClaim).toHaveBeenCalledWith("claim-4");
  });
});
