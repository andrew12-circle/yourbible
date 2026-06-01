import { describe, expect, it } from "vitest";
import {
  isArtifactLayoutDesktop,
  isArtifactPipVideo,
  isArtifactStickyVideo,
} from "@/hooks/useArtifactLayoutMode";

describe("useArtifactLayoutMode helpers", () => {
  it("treats tablet like phone for sticky mobile YouTube chrome", () => {
    expect(isArtifactStickyVideo("tablet", true)).toBe(true);
    expect(isArtifactPipVideo("tablet", true)).toBe(false);
    expect(isArtifactLayoutDesktop("tablet")).toBe(false);
  });

  it("uses desktop PiP only at desktop breakpoint", () => {
    expect(isArtifactStickyVideo("desktop", true)).toBe(false);
    expect(isArtifactPipVideo("desktop", true)).toBe(true);
    expect(isArtifactLayoutDesktop("desktop")).toBe(true);
  });
});
