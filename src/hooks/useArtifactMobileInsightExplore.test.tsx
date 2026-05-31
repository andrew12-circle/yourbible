import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useArtifactMobileInsightExplore } from "@/hooks/useArtifactMobileInsightExplore";
import type { ArtifactMobileTab } from "@/hooks/useArtifactDetailMobileTabs";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("useArtifactMobileInsightExplore", () => {
  it("closes an insight claim and runs the close callback", () => {
    const onClose = vi.fn();
    const { result } = renderHook(
      ({ tab }: { tab: ArtifactMobileTab }) => useArtifactMobileInsightExplore(tab, onClose),
      { initialProps: { tab: "study" } },
    );

    act(() => result.current.setMobileInsightExploreClaimId("claim-1"));
    expect(result.current.mobileInsightExploreClaimId).toBe("claim-1");

    act(() => result.current.closeMobileInsightExplore());

    expect(result.current.mobileInsightExploreClaimId).toBeNull();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
