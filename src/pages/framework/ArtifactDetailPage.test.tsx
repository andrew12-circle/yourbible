import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  isArtifactStickyVideo: (mode: string, hasYouTube: boolean) => hasYouTube && mode === "phone",
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

vi.mock("@/hooks/useArtifactVideoPlayback", () => ({
  useArtifactVideoPlayback: () => ({
    pipEnabled: false,
    youtubePip: { videoSlotRef: { current: null }, pipMode: false },
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
  }),
}));

vi.mock("@/lib/journal/floatingJournalStore", () => ({
  useFloatingJournalStore: Object.assign(
    (selector: (state: { panelOpen: boolean; togglePanel: () => void }) => unknown) =>
      selector({ panelOpen: false, togglePanel: vi.fn() }),
    {
      getState: () => ({
        setPlaybackCaptureAvailable: vi.fn(),
        setRouteArtifact: vi.fn(),
      }),
    },
  ),
}));

vi.mock("./FrameworkLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/framework/artifact-detail/ArtifactYoutubeVideoBlock", () => ({
  default: () => <div data-testid="youtube-block" />,
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
});

describe("ArtifactDetailPage", () => {
  it("keeps the full claims section available on pinned mobile YouTube artifacts with many claims", () => {
    render(
      <MemoryRouter initialEntries={["/framework/artifacts/artifact-1"]}>
        <Routes>
          <Route path="/framework/artifacts/:id" element={<ArtifactDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Key insights" })).toBeInTheDocument();
    expect(screen.getAllByText("28 insights").length).toBeGreaterThan(0);
    expect(screen.getByTestId("full-claims-section")).toHaveTextContent("28 full claims");
  });
});
