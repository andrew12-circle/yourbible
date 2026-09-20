import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useYouTubeDocumentPip } from "@/hooks/useYouTubeDocumentPip";
import { useArtifactGlobalDocumentPipStore } from "@/lib/framework/artifactGlobalDocumentPipStore";
afterEach(() => { cleanup(); useArtifactGlobalDocumentPipStore.getState().clear(); });
describe("document PiP controller identity", () => {
  it("does not reset the inline video identity when PiP opens or closes", () => {
    const options = { enabled: false, artifactId: "a", youTubeVideoId: "aaaaaaaaaaa", videoSlotRef: { current: null } };
    const { result, rerender } = renderHook(() => useYouTubeDocumentPip(options));
    const exit = result.current.exitDocumentPip;
    act(() => useArtifactGlobalDocumentPipStore.getState().setActive(true));
    expect(result.current.exitDocumentPip).toBe(exit);
    act(() => useArtifactGlobalDocumentPipStore.getState().setActive(false));
    rerender();
    expect(result.current.exitDocumentPip).toBe(exit);
  });
});
