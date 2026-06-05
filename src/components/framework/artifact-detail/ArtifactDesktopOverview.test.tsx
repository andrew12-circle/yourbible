import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactDesktopOverview from "./ArtifactDesktopOverview";

vi.mock("@/components/framework/ArtifactEntitiesPanel", () => ({
  default: () => <div>People and themes panel</div>,
}));

vi.mock("@/components/framework/artifact-detail/ArtifactInsightRail", () => ({
  default: () => <div>Insight rail</div>,
}));

vi.mock("@/components/framework/artifact-detail/ArtifactOverviewSummary", () => ({
  default: () => <div>Framework summary</div>,
}));

const claims = [
  {
    id: "claim-1",
    claim: "Wisdom should lead to faithful obedience.",
    verdict: null,
    scripture_supports: [{ ref: "James 1:5" }],
  },
];

afterEach(() => {
  cleanup();
});

describe("ArtifactDesktopOverview", () => {
  it("shows study content without shortcut cards", () => {
    render(
      <ArtifactDesktopOverview
        claims={claims}
        artifactId="artifact-1"
        artifactStatus="ready"
        claimsCount={claims.length}
        entitiesCount={2}
        onNavigate={vi.fn()}
        onSelectClaim={vi.fn()}
      />,
    );

    expect(screen.queryByText("Continue studying")).not.toBeInTheDocument();
    expect(screen.queryByText("Study spine")).not.toBeInTheDocument();
    expect(screen.getByText("Key claims")).toBeInTheDocument();
    expect(screen.getByText("Insight rail")).toBeInTheDocument();
    expect(screen.getByText("People and themes panel")).toBeInTheDocument();
  });

  it("shows framework summary when provided", () => {
    render(
      <ArtifactDesktopOverview
        claims={claims}
        artifactId="artifact-1"
        artifactStatus="ready"
        claimsCount={claims.length}
        frameworkOverview={{
          summary: "Overview text",
          key_points: ["Point one"],
          framework_alignment: { aligns: [], conflicts: [], new_ground: [] },
          generated_at: "2026-06-05T12:00:00.000Z",
        }}
        onNavigate={vi.fn()}
        onSelectClaim={vi.fn()}
      />,
    );

    expect(screen.getByText("Framework summary")).toBeInTheDocument();
  });
});
