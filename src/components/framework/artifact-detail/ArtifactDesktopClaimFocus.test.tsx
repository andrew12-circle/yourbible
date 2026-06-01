import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import ArtifactDesktopClaimFocus from "./ArtifactDesktopClaimFocus";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";

const claim: RenderClaimCardClaim = {
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
            claims={[claim]}
            claimCardContext={claimCardContext}
            onBack={vi.fn()}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Back to overview" })).toHaveTextContent("Back to overview");
    expect(screen.getByText(claim.claim)).toBeInTheDocument();
  });
});
