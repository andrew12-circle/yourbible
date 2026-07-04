import { beforeEach, describe, expect, it } from "vitest";
import {
  registerDocumentPipActivateHandler,
  registerDocumentPipSyncInline,
  syncInlineFromDocumentPip,
  triggerDocumentPipActivate,
  useArtifactGlobalDocumentPipStore,
} from "./artifactGlobalDocumentPipStore";

describe("artifactGlobalDocumentPipStore", () => {
  beforeEach(() => {
    useArtifactGlobalDocumentPipStore.getState().clear();
    registerDocumentPipSyncInline(null);
    registerDocumentPipActivateHandler(null);
  });

  it("tracks session, active state, and popout playback", () => {
    useArtifactGlobalDocumentPipStore.getState().setSession({
      artifactId: "art-1",
      youTubeVideoId: "vid-1",
      title: "Sermon",
    });
    useArtifactGlobalDocumentPipStore.getState().setActive(true);
    useArtifactGlobalDocumentPipStore.getState().setPopoutPlayback({ seconds: 90, playing: true });

    const state = useArtifactGlobalDocumentPipStore.getState();
    expect(state.session?.artifactId).toBe("art-1");
    expect(state.active).toBe(true);
    expect(state.popoutPlayback.seconds).toBe(90);
    expect(state.popoutPlayback.playing).toBe(true);

    useArtifactGlobalDocumentPipStore.getState().clear();
    expect(useArtifactGlobalDocumentPipStore.getState().session).toBeNull();
    expect(useArtifactGlobalDocumentPipStore.getState().active).toBe(false);
  });

  it("invokes registered activate and sync handlers", () => {
    let activated = false;
    let synced: { seconds: number; resume: boolean } | null = null;

    registerDocumentPipActivateHandler(() => {
      activated = true;
    });
    registerDocumentPipSyncInline((seconds, resume) => {
      synced = { seconds, resume };
    });

    triggerDocumentPipActivate();
    expect(activated).toBe(true);

    syncInlineFromDocumentPip(true, { seconds: 42, playing: true });
    expect(synced).toEqual({ seconds: 42, resume: true });
  });
});
