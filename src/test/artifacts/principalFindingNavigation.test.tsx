import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactMobileOverview from "@/components/framework/artifact-detail/ArtifactMobileOverview";
vi.mock("@/components/framework/ArtifactEntitiesPanel", () => ({ default: () => null }));
vi.mock("@/components/framework/artifact-detail/ArtifactMobileInsightHeroRail", () => ({
  default: ({ claims }: { claims: { id: string; claim: string }[] }) => <div>{claims.map(c => <div key={c.id} data-testid="finding">{c.claim}</div>)}</div>,
}));
afterEach(cleanup);
const props = { artifactId: "a", artifactStatus: "ready", onNavigate: vi.fn(), onSelectClaim: vi.fn(), claimsCount: 20 };
const claims = Array.from({ length: 20 }, (_, i) => ({ id: String(i), claim: `Finding ${i}`, verdict: null, importance_score: 100 - i, is_primary: i < 8 }));
describe("all findings remain reachable on mobile", () => {
  it("shows principals first and can open every finding without losing the selected source", () => {
    render(<ArtifactMobileOverview {...props} claims={claims} />);
    expect(screen.getAllByTestId("finding")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Show all 20 findings" }));
    expect(screen.getAllByTestId("finding")).toHaveLength(20);
    expect(screen.getByText("Finding 19")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show principal findings" }));
    expect(screen.getAllByTestId("finding")).toHaveLength(8);
  });
  it("does not invent a principal ranking or hide old findings", () => {
    render(<ArtifactMobileOverview {...props} claims={claims.map(c => ({ ...c, is_primary: false, importance_score: undefined }))} />);
    expect(screen.getByText("Key insights")).toBeInTheDocument();
    expect(screen.getAllByTestId("finding")).toHaveLength(20);
  });
  it("exposes supporting findings even when fewer than eight principals exist", () => {
    render(<ArtifactMobileOverview {...props} claimsCount={6} claims={claims.slice(0, 6).map((c, i) => ({ ...c, is_primary: i < 3 }))} />);
    expect(screen.getAllByTestId("finding")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Show all 6 findings" }));
    expect(screen.getAllByTestId("finding")).toHaveLength(6);
  });
  it("resets expanded findings when navigating to another source", () => {
    const view = render(<ArtifactMobileOverview {...props} claims={claims} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all 20 findings" }));
    view.rerender(<ArtifactMobileOverview {...props} artifactId="b" claims={claims} />);
    expect(screen.getAllByTestId("finding")).toHaveLength(8);
  });
});
