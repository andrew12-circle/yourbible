import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useArtifactDetailMobileTabs } from "@/hooks/useArtifactDetailMobileTabs";

function setPath(path: string) {
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useArtifactDetailMobileTabs", () => {
  it("syncs browser hash back navigation from transcript to study", () => {
    setPath("/framework/artifacts/artifact-1#transcript");

    const { result } = renderHook(() => useArtifactDetailMobileTabs());

    expect(result.current.mobileTab).toBe("transcript");

    act(() => setPath("/framework/artifacts/artifact-1"));

    expect(result.current.mobileTab).toBe("study");
  });

  it("clears transcript and notes hashes when the Study dock action is used", () => {
    setPath("/framework/artifacts/artifact-1#notes");

    const { result } = renderHook(() => useArtifactDetailMobileTabs());

    expect(result.current.mobileTab).toBe("notes");

    act(() => result.current.openStudyTab());

    expect(result.current.mobileTab).toBe("study");
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/framework/artifacts/artifact-1");
  });
});
