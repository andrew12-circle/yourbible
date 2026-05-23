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
        showChapters={false}
        showTeachingsSpine={false}
        onNavigate={onNavigate}
        onSelectClaim={onSelectClaim}
      />,
    );

    expect(screen.getAllByText("Key insights").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /view all/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Wisdom should lead/i }));

    expect(onSelectClaim).toHaveBeenCalledWith("claim-1");
    expect(onNavigate).not.toHaveBeenCalledWith("#claims");
  });
});
