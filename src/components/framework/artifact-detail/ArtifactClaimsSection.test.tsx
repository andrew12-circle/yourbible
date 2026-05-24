import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import ArtifactClaimsSection from "@/components/framework/artifact-detail/ArtifactClaimsSection";
import type { RenderClaimCardContext } from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";

vi.mock("@/components/framework/artifact-detail/renderArtifactDetailClaimCard", () => ({
  renderArtifactDetailClaimCard: (claim: { id: string; claim: string }, claimIndex: number) => (
    <article id={claim.id} data-testid={`claim-card-${claimIndex + 1}`}>
      {claim.claim}
    </article>
  ),
}));

const claims = Array.from({ length: 30 }, (_, index) => ({
  id: `claim-${index + 1}`,
  claim: `Claim ${index + 1}`,
  verdict: null,
  chapter_start_seconds: index * 10,
}));

const claimCardContext: RenderClaimCardContext = {
  isDesktop: false,
  youTubeVideoId: "video-1",
  claimSources: {},
  matchedBeliefs: {},
  playClaimAtSource: vi.fn(),
  startClaimResearchChat: vi.fn(),
  openJournalFromClaim: vi.fn(),
  toggleResearchLater: vi.fn(),
  applyClaimVerdict: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: 100,
      y: 100,
      top: 100,
      right: 220,
      bottom: 220,
      left: 100,
      width: 120,
      height: 120,
      toJSON: () => ({}),
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ArtifactClaimsSection", () => {
  it("pauses playback follow when the horizontal claims rail is user-scrolled", () => {
    render(
      <TooltipProvider>
        <ArtifactClaimsSection
          claims={claims}
          claimChapterLayout={{ grouped: false, groups: [] }}
          glossaryEntries={claims.map((claim, index) => ({
            id: claim.id,
            claim: claim.claim,
            verdict: claim.verdict,
            number: index + 1,
          }))}
          youTubeVideoId="video-1"
          onJumpToClaim={vi.fn()}
          onSeekChapter={vi.fn()}
          claimCardContext={claimCardContext}
          getClaimSeekSeconds={(claim) => claim.chapter_start_seconds}
          playerReady
          isPlaying
          getPlaybackSeconds={() => 0}
          onTogglePlayback={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Following playback" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(650);
    });
    fireEvent.scroll(screen.getByRole("list", { name: "Claims" }));

    expect(screen.getByRole("button", { name: "Follow playback" })).toBeInTheDocument();
  });
});
