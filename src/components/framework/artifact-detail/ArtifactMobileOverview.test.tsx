import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  {
    id: "claim-3",
    claim: "Hope should reshape attention over time.",
    verdict: null,
    scripture_supports: [{ ref: "Romans 12:2" }],
  },
  {
    id: "claim-4",
    claim: "Practice can deepen faithful imagination.",
    verdict: null,
    scripture_supports: [{ ref: "Philippians 4:8" }],
  },
];

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get() {
      const insightIndex = Number((this as HTMLElement).dataset?.insightIndex);
      return Number.isFinite(insightIndex) ? insightIndex * 300 : 0;
    },
  });
});

afterEach(() => {
  cleanup();
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

    const card = screen.getByRole("button", { name: /Wisdom should lead/i });
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(card, { clientX: 10, clientY: 10 });

    expect(onSelectClaim).toHaveBeenCalledWith("claim-1");
    expect(onNavigate).not.toHaveBeenCalledWith("#claims");
  });

  it("renders key insights as a mobile rail with explicit navigation controls", () => {
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
    expect(rail).toHaveClass("overflow-hidden", "touch-pan-x", "overscroll-x-contain");
    expect(screen.getAllByRole("listitem")).toHaveLength(multipleClaims.length);
    expect(screen.getByRole("button", { name: "Next insight" })).toBeInTheDocument();

    const insightTwoTab = screen.getByRole("tab", { name: "Insight 2" });
    fireEvent.click(insightTwoTab);

    expect(insightTwoTab).toHaveAttribute("aria-selected", "true");
  });

  it("lets a fast horizontal flick advance through multiple insight cards", () => {
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
    fireEvent.pointerDown(rail, { pointerId: 1, clientX: 320, clientY: 120, timeStamp: 0 });
    fireEvent.pointerMove(rail, { pointerId: 1, clientX: 120, clientY: 126, timeStamp: 100 });
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 80, clientY: 126, timeStamp: 120 });

    expect(screen.getByRole("tab", { name: "Insight 3" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens claim review when pointerup lands on the rail after a card tap", () => {
    const onSelectClaim = vi.fn();

    render(
      <ArtifactMobileOverview
        claims={claims}
        artifactId="artifact-1"
        artifactStatus="ready"
        claimsCount={claims.length}
        entitiesCount={2}
        onNavigate={vi.fn()}
        onSelectClaim={onSelectClaim}
      />,
    );

    const rail = screen.getByRole("list", { name: /key insight cards/i });
    const card = screen.getByRole("button", { name: /Wisdom should lead/i });

    fireEvent.pointerDown(card, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(rail, { pointerId: 1, clientX: 10, clientY: 10 });

    expect(onSelectClaim).toHaveBeenCalledWith("claim-1");
  });

  it("advances the insight rail when dragging from an insight card", () => {
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

    const card = screen.getByRole("button", { name: /Wisdom should lead/i });
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 300, clientY: 120, timeStamp: 0 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 100, clientY: 124, timeStamp: 100 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 60, clientY: 124, timeStamp: 120 });

    expect(screen.getByRole("tab", { name: "Insight 3" })).toHaveAttribute("aria-selected", "true");
  });
});
