import { describe, expect, it } from "vitest";
import {
  measureArtifactMobileVideoBlockHeight,
  readArtifactLayoutPxVar,
  setArtifactLayoutPxVar,
} from "./artifactMobileLayoutSync";

describe("artifactMobileLayoutSync", () => {
  it("sets layout vars on first write and ignores sub-pixel churn", () => {
    const root = document.createElement("div");

    expect(setArtifactLayoutPxVar(root, "--artifact-mobile-video-h", 211.2)).toBe(true);
    expect(root.style.getPropertyValue("--artifact-mobile-video-h")).toBe("211px");
    expect(readArtifactLayoutPxVar(root, "--artifact-mobile-video-h")).toBe(211);

    expect(setArtifactLayoutPxVar(root, "--artifact-mobile-video-h", 211.6)).toBe(false);
    expect(root.style.getPropertyValue("--artifact-mobile-video-h")).toBe("211px");

    expect(setArtifactLayoutPxVar(root, "--artifact-mobile-video-h", 214)).toBe(true);
    expect(root.style.getPropertyValue("--artifact-mobile-video-h")).toBe("214px");
  });

  it("derives pinned video height from aspect slot width", () => {
    const root = document.createElement("div");
    root.style.paddingTop = "20px";
    root.style.paddingBottom = "8px";
    const aspect = document.createElement("div");
    aspect.className = "aspect-video";
    Object.defineProperty(aspect, "offsetWidth", { value: 320, configurable: true });
    root.appendChild(aspect);

    expect(measureArtifactMobileVideoBlockHeight(root)).toBe(20 + Math.round((320 * 9) / 16) + 8);
  });
});
