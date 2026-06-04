import { describe, expect, it, vi, beforeEach } from "vitest";
import { useArtifactGlobalVideoPipStore } from "./artifactGlobalVideoPipStore";
import {
  artifactJournalReturnPath,
  handoffArtifactVideoForJournal,
} from "./artifactJournalNavigation";

describe("artifactJournalNavigation", () => {
  beforeEach(() => {
    useArtifactGlobalVideoPipStore.setState({ session: null });
  });

  it("builds artifact journal return path with hash", () => {
    expect(artifactJournalReturnPath("abc-123")).toBe("/framework/artifacts/abc-123#journal");
  });

  it("starts global PiP when handing off for journal navigation", () => {
    const persistSeconds = vi.fn();
    handoffArtifactVideoForJournal({
      artifactId: "art-1",
      youTubeVideoId: "vid-1",
      title: "Test video",
      getPlaybackSeconds: () => 42,
      getIsPlaying: () => true,
      persistSeconds,
    });

    expect(persistSeconds).toHaveBeenCalledWith(42);
    expect(useArtifactGlobalVideoPipStore.getState().session).toMatchObject({
      artifactId: "art-1",
      youTubeVideoId: "vid-1",
      startSeconds: 42,
      resumePlayback: true,
    });
  });
});
