import { describe, expect, it } from "vitest";
import {
  artifactShellFromSeed,
  peekArtifactShellCache,
  prepareArtifactNavigation,
  seedArtifactShellCache,
} from "./artifactShellCache";

describe("artifactShellCache", () => {
  it("stores and peeks shell rows", () => {
    const seed = {
      id: "artifact-1",
      title: "Test video",
      kind: "youtube",
      status: "ready",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      metadata: { video_id: "dQw4w9WgXcQ" },
      created_at: "2026-01-01T00:00:00Z",
    };
    seedArtifactShellCache(seed);
    const cached = peekArtifactShellCache("artifact-1");
    expect(cached).toEqual(artifactShellFromSeed(seed));
  });

  it("prepareArtifactNavigation seeds without throwing", () => {
    expect(() =>
      prepareArtifactNavigation({
        id: "artifact-2",
        title: "Warm",
        kind: "youtube",
        status: "ready",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    ).not.toThrow();
    expect(peekArtifactShellCache("artifact-2")?.kind).toBe("youtube");
  });
});
