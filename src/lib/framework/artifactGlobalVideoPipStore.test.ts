import { describe, expect, it, beforeEach } from "vitest";
import { useArtifactGlobalVideoPipStore } from "./artifactGlobalVideoPipStore";

describe("artifactGlobalVideoPipStore", () => {
  beforeEach(() => {
    useArtifactGlobalVideoPipStore.setState({ session: null });
  });

  it("starts and dismisses a global PiP session", () => {
    useArtifactGlobalVideoPipStore.getState().startSession({
      artifactId: "art-1",
      youTubeVideoId: "vid-1",
      title: "Sermon",
      startSeconds: 42,
      resumePlayback: true,
    });

    const active = useArtifactGlobalVideoPipStore.getState().session;
    expect(active?.artifactId).toBe("art-1");
    expect(active?.youTubeVideoId).toBe("vid-1");
    expect(active?.startSeconds).toBe(42);
    expect(active?.resumePlayback).toBe(true);
    expect(active?.layout.width).toBeGreaterThanOrEqual(300);

    useArtifactGlobalVideoPipStore.getState().dismiss();
    expect(useArtifactGlobalVideoPipStore.getState().session).toBeNull();
  });
});
