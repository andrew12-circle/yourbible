import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import ArtifactDetailPage from "./ArtifactDetailPage";

const claims = Array.from({ length: 28 }, (_, index) => ({
  id: `claim-${index + 1}`,
  claim: `Claim ${index + 1}`,
  verdict: null,
  tone: null,
  doctrine_tags: [],
  match_relation: null,
  matched_belief_id: null,
  bias_flags: [],
  scripture_supports: [],
  scripture_challenges: [],
  chapter_start_seconds: index * 10,
  chapter_title: null,
  created_at: `2026-01-01T00:00:${String(index).padStart(2, "0")}Z`,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useArtifactLayoutMode", () => ({
  useArtifactLayoutMode: () => "phone",
  isArtifactLayoutDesktop: (mode: string) => mode === "desktop",
  isArtifactStickyVideo: (mode: string, hasYouTube: boolean) => hasYouTube && mode !== "desktop",
  isArtifactPipVideo: (mode: string, hasYouTube: boolean) => hasYouTube && mode === "desktop",
}));

vi.mock("@/hooks/useArtifactDetailData", () => ({
  useArtifactDetailData: () => ({
    a: {
      id: "artifact-1",
      title: "A long video",
      kind: "youtube",
      status: "ready",
      error: null,
      raw_text: "",
      url: "https://www.youtube.com/watch?v=abc123def45",
      metadata: { video_id: "abc123def45" },
      created_at: "2026-01-01T00:00:00Z",
    },
    setA: vi.fn(),
    artifactLoaded: true,
    claims,
    setClaims: vi.fn(),
    matchedBeliefs: {},
    moments: [],
    setMoments: vi.fn(),
    polling: false,
    elapsed: 0,
    inFlight: false,
    loadFull: vi.fn(),
    patchArtifactMetadata: vi.fn(),
  }),
}));

vi.mock("@/hooks/useArtifactEntityCount", () => ({
  useArtifactEntityCount: () => 0,
}));

vi.mock("@/hooks/useArtifactCorpusStanding", () => ({
  useArtifactCorpusStanding: () => ({
    peerLibraryCount: 0,
    peers: [],
    echoClaimCount: 0,
    loading: false,
    error: null,
    embeddingPending: false,
    reload: vi.fn(),
  }),
}));

vi.mock("@/lib/framework/claimResearchRuns", () => ({
  fetchLastResearchedAtByClaimIds: vi.fn(async () => ({})),
}));

vi.mock("@/hooks/useArtifactGlobalVideoHandoff", () => ({
  useArtifactGlobalVideoHandoff: () => {},
}));

vi.mock("@/hooks/useArtifactVideoPlayback", () => ({
  useArtifactVideoPlayback: () => ({
    pipEnabled: false,
    youtubePip: {
      videoSlotRef: { current: null },
      pipMode: false,
      enterPip: vi.fn(),
      scrollVideoIntoView: vi.fn(),
    },
    youtubePlayer: { setPlaybackRate: vi.fn() },
    seekVideoToSeconds: vi.fn(),
    scrollTranscriptToSeconds: vi.fn(),
    getPlaybackSeconds: () => 0,
    activatePlayer: vi.fn(),
    activateAndPlay: vi.fn(),
    togglePlayback: vi.fn(),
    isPlaying: false,
    getIsPlaying: () => false,
    pauseVideo: vi.fn(),
    playVideo: vi.fn(),
    staticEmbedSrc: null,
    onStaticEmbedLoad: vi.fn(),
    showApiPlayer: false,
    useStaticPip: false,
    playerReady: false,
    documentPip: {
      documentPipSupported: false,
      documentPipActive: false,
      enterDocumentPip: vi.fn(),
      exitDocumentPip: vi.fn(),
    },
    handleRestoreFromDocumentPip: vi.fn(),
  }),
}));

vi.mock("@/lib/journal/floatingJournalStore", () => ({
  useFloatingJournalStore: Object.assign(
    (selector: (state: { panelOpen: boolean; artifactJournalMode: string; togglePanel: () => void }) => unknown) =>
      selector({ panelOpen: false, artifactJournalMode: "closed", togglePanel: vi.fn() }),
    {
      getState: () => ({
        setPlaybackCaptureAvailable: vi.fn(),
        setRouteArtifact: vi.fn(),
        setArtifactJournalMode: vi.fn(),
        setPanelOpen: vi.fn(),
        setFloatingClaimResearch: vi.fn(),
        artifactJournalMode: "closed",
        panelOpen: false,
      }),
    },
  ),
}));

vi.mock("./FrameworkLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/framework/artifact-detail/ArtifactYoutubeVideoBlock", () => ({
  default: ({ insightExplorePanel }: { insightExplorePanel?: React.ReactNode }) => (
    <div data-testid="youtube-block">{insightExplorePanel}</div>
  ),
}));

vi.mock("@/components/framework/artifact-detail/ArtifactClaimsSection", () => ({
  default: ({ claims: renderedClaims }: { claims: typeof claims }) => (
    <div data-testid="full-claims-section">{renderedClaims.length} full claims</div>
  ),
}));

vi.mock("@/components/framework/ArtifactEntitiesPanel", () => ({
  default: () => <div>People and themes</div>,
}));

vi.mock("@/components/framework/TeachingsPanel", () => ({
  default: () => <div>Teachings panel</div>,
}));

vi.mock("@/components/framework/TranscriptPanel", () => ({
  default: () => <div>Transcript panel</div>,
}));

vi.mock("@/components/framework/artifact-detail/ArtifactHeaderActions", () => ({
  default: () => <div />,
}));

vi.mock("@/components/framework/artifact-detail/ArtifactDetailPageDialogs", () => ({
  default: () => <div />,
}));

vi.mock("@/components/navigation/MobileAppDock", () => ({
  default: () => <nav>Mobile dock</nav>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("ArtifactDetailPage", () => {
  it("keeps pinned mobile YouTube artifacts on the key insights picker before review", () => {
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={["/framework/artifacts/artifact-1"]}>
          <Routes>
            <Route path="/framework/artifacts/:id" element={<ArtifactDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(screen.getByRole("heading", { name: "Key insights" })).toBeInTheDocument();
    expect(screen.getAllByText("28 insights").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("full-claims-section")).not.toBeInTheDocument();
  });

  it("scrolls back to the mobile insight picker when closing an explored insight", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={["/framework/artifacts/artifact-1"]}>
          <Routes>
            <Route path="/framework/artifacts/:id" element={<ArtifactDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );

    const claimCard = screen.getByText("Claim 1");
    fireEvent.pointerDown(claimCard, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(claimCard, { clientX: 10, clientY: 10 });
    fireEvent.click(await screen.findByRole("button", { name: "Back to study" }));

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    });
    expect(screen.queryByRole("button", { name: "Back to study" })).not.toBeInTheDocument();
  });
});
