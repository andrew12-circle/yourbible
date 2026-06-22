import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactLibraryStanding from "./ArtifactLibraryStanding";
import type { CorpusPeerMatch } from "@/lib/framework/artifactCorpusStanding";

vi.mock("@/components/framework/BeliefAlignmentBar", () => ({
  BeliefAlignmentBar: () => <div>Belief alignment bar</div>,
}));

const peers: CorpusPeerMatch[] = [
  {
    peerArtifactId: "peer-1",
    peerTitle: "Related sermon",
    avgSimilarity: 0.6,
    strongMatchCount: 2,
    topSourceClaim: "Source claim text",
    topPeerClaim: "Peer claim text",
  },
  {
    peerArtifactId: "peer-2",
    peerTitle: "Another talk",
    avgSimilarity: 0.55,
    strongMatchCount: 1,
    topSourceClaim: "Another source claim",
    topPeerClaim: "Another peer claim",
  },
];

afterEach(() => {
  cleanup();
});

describe("ArtifactLibraryStanding", () => {
  it("collapses library matches by default", () => {
    render(
      <MemoryRouter>
        <ArtifactLibraryStanding
          artifactId="artifact-1"
          claimsCount={10}
          agreeCount={0}
          disagreeCount={0}
          newCount={10}
          peerLibraryCount={5}
          peers={peers}
          echoClaimCount={0}
          loading={false}
          error={null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("2 library matches")).toBeInTheDocument();
    expect(screen.queryByText("Related sermon")).not.toBeInTheDocument();
    expect(screen.queryByText("Another talk")).not.toBeInTheDocument();
  });
});
