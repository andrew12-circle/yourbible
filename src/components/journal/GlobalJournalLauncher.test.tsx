import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalJournalLauncher from "./GlobalJournalLauncher";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/components/journal/FloatingJournalPanel", () => ({
  default: () => <div data-testid="floating-journal-panel">Research panel</div>,
}));

beforeEach(() => {
  useFloatingJournalStore.setState({
    panelOpen: false,
    floatingClaimResearch: null,
    routeArtifact: { id: "art-1", title: "Video", kind: "youtube", youTubeVideoId: "yt1" },
  });
});

afterEach(() => cleanup());

describe("GlobalJournalLauncher", () => {
  it("renders claim research panel on artifact routes when panel is open", () => {
    useFloatingJournalStore.setState({
      panelOpen: true,
      floatingClaimResearch: {
        claimId: "c1",
        artifactId: "art-1",
        claimMarkdown: "Claim text",
        journalTitle: "Research",
        initialTab: "chat",
        claimPreview: "Preview",
        matchedBeliefId: null,
        artifactTitle: "Video",
      },
    });

    render(
      <MemoryRouter initialEntries={["/framework/artifacts/art-1"]}>
        <GlobalJournalLauncher />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("floating-journal-panel")).toBeInTheDocument();
    expect(screen.queryByTitle("Journal")).not.toBeInTheDocument();
  });

  it("does not render on artifact routes when panel is closed and chrome is hidden", () => {
    render(
      <MemoryRouter initialEntries={["/framework/artifacts/art-1"]}>
        <GlobalJournalLauncher />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("floating-journal-panel")).not.toBeInTheDocument();
  });
});
