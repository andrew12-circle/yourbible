import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArtifactMobileOverview from "./ArtifactMobileOverview";

vi.mock("@/components/framework/ArtifactEntitiesPanel", () => ({
  default: () => <div>People and themes rail</div>,
}));

const claims = [
  {
    id: "claim-1",
    claim: "Wisdom should lead to faithful obedience.",
    verdict: null,
    scripture_supports: [{ ref: "James 1:5" }],
  },
];

const multipleClaims = [
  ...claims,
  {
    id: "claim-2",
    claim: "Discernment should test claims before accepting them.",
    verdict: null,
    scripture_supports: [{ ref: "1 John 4:1" }],
  },
];

const scrollIntoView = vi.fn();

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
});

afterEach(() => {
  cleanup();
  scrollIntoView.mockClear();
});

describe("ArtifactMobileOverview", () => {
  it("opens claim review from key insight cards without a view-all claims link", () => {
    const onNavigate = vi.fn();
    const onSelectClaim = vi.fn();

    render(
      <ArtifactMobileOverview
        claims={claims}
        artifactId="artifact-1"
        artifactStatus="ready"
        claimsCount={claims.length}
        entitiesCount={2}
        onNavigate={onNavigate}
        onSelectClaim={onSelectClaim}
      />,
    );

    expect(screen.getAllByText("Key insights").length).toBeGreaterThan(0);
    expect(screen.queryByText("Continue studying")).not.toBeInTheDocument();
    expect(screen.queryByText("Study spine")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view all/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Wisdom should lead/i }));

    expect(onSelectClaim).toHaveBeenCalledWith("claim-1");
    expect(onNavigate).not.toHaveBeenCalledWith("#claims");
  });

  it("renders key insights as a snap-scrolling mobile rail", () => {
    render(
      <ArtifactMobileOverview
        claims={multipleClaims}
        artifactId="artifact-1"
        artifactStatus="ready"
        claimsCount={multipleClaims.length}
        entitiesCount={2}
        onNavigate={vi.fn()}
        onSelectClaim={vi.fn()}
      />,
    );

    const rail = screen.getByRole("list", { name: /key insight cards/i });
    expect(rail).toHaveClass("overflow-x-auto", "snap-x", "snap-mandatory", "touch-pan-x");
    expect(screen.getAllByRole("listitem")).toHaveLength(multipleClaims.length);

    fireEvent.click(screen.getByRole("tab", { name: "Insight 2" }));

    expect(scrollIntoView).toHaveBeenCalled();
  });
});
