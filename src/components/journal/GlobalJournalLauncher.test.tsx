import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalJournalLauncher, { journalLauncherChromeHidden } from "./GlobalJournalLauncher";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import { useAppShellMode } from "@/hooks/useAppShellMode";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useAppShellMode", () => ({
  useAppShellMode: vi.fn(() => ({ homeMode: "ios", showHubShell: false })),
}));

vi.mock("@/components/journal/FloatingJournalPanel", () => ({
  default: () => <div data-testid="floating-journal-panel">Research panel</div>,
}));

beforeEach(() => {
  vi.mocked(useAppShellMode).mockReturnValue({ homeMode: "ios", showHubShell: false });
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

  it("hides the journal tab in hub shell mode", () => {
    vi.mocked(useAppShellMode).mockReturnValue({ homeMode: "hub", showHubShell: true });

    render(
      <MemoryRouter initialEntries={["/framework/daily"]}>
        <GlobalJournalLauncher />
      </MemoryRouter>,
    );

    expect(screen.queryByTitle("Journal")).not.toBeInTheDocument();
  });

  it("journalLauncherChromeHidden returns true for hub shell", () => {
    expect(journalLauncherChromeHidden("/framework/daily", true)).toBe(true);
    expect(journalLauncherChromeHidden("/framework/daily", false)).toBe(false);
  });
});
