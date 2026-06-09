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
  it("keeps navigation in the header and claim actions in a bottom dock", () => {
    const onBack = vi.fn();
    const { container } = render(
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

    const actionToolbar = screen.getByRole("toolbar", { name: "Claim actions" });
    expect(backButton.parentElement).not.toContainElement(actionToolbar);
    expect(screen.getByText("Defer")).toBeInTheDocument();
    expect(within(actionToolbar).getByText("Research")).toBeInTheDocument();
    expect(within(actionToolbar).getByText("Reflect")).toBeInTheDocument();
    expect(within(actionToolbar).getByText("Keep")).toBeInTheDocument();
    expect(within(actionToolbar).getByText("Reject")).toBeInTheDocument();
    expect(container.querySelector(".backdrop-blur-md")).toBeTruthy();
    expect(container.querySelector("section")?.className).toMatch(/h-full/);
  });

  it("shows Next when another claim follows", () => {
    const onNext = vi.fn();
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ArtifactMobileInsightExplorePanel
            claim={claim}
            claimIndex={1}
            claimCardContext={{ ...claimCardContext, isDesktop: true }}
            onBack={vi.fn()}
            onNext={onNext}
            nextClaimNumber={3}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    const nextButton = screen.getByRole("button", { name: "Go to claim 3" });
    fireEvent.click(nextButton);
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("shows claim actions below the header on desktop", () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <ArtifactMobileInsightExplorePanel
            claim={claim}
            claimIndex={1}
            claimCardContext={{ ...claimCardContext, isDesktop: true }}
            onBack={vi.fn()}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    const backButton = screen.getByRole("button", { name: "Back to study" });
    const actionToolbar = screen.getByRole("toolbar", { name: "Claim actions" });
    expect(backButton.parentElement?.nextElementSibling?.contains(actionToolbar)).toBe(true);
    expect(screen.queryByText("Keep")).toBeInTheDocument();
    expect(screen.queryByText("Research")).toBeInTheDocument();
  });
});
