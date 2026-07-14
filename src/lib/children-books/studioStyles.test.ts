import { describe, expect, it } from "vitest";
import {
  ACTIVE_STUDIO_STYLE_VERSION,
  getStudioStyle,
  STUDIO_STYLES,
} from "@/lib/children-books/studioStyles";

describe("versioned studio styles", () => {
  it("exposes v1 and v2 with the active version set to v2", () => {
    expect(Object.keys(STUDIO_STYLES).sort()).toEqual(["v1", "v2"]);
    expect(ACTIVE_STUDIO_STYLE_VERSION).toBe("v2");
    expect(STUDIO_STYLES.v1.version).toBe("v1");
    expect(STUDIO_STYLES.v2.version).toBe("v2");
  });

  it("returns the requested version and falls back to the active version", () => {
    expect(getStudioStyle("v1").version).toBe("v1");
    expect(getStudioStyle("v2").version).toBe("v2");
    expect(getStudioStyle().version).toBe(ACTIVE_STUDIO_STYLE_VERSION);
    expect(getStudioStyle("nope").version).toBe(ACTIVE_STUDIO_STYLE_VERSION);
  });

  it("v1 keeps the original golden-hour language; v2 forbids it", () => {
    expect(STUDIO_STYLES.v1.studioStyle).toContain("studioStyle_v1");
    expect(STUDIO_STYLES.v1.studioStyle).toContain("golden-hour");

    expect(STUDIO_STYLES.v2.studioStyle).toContain("studioStyle_v2");
    expect(STUDIO_STYLES.v2.studioStyle).toContain("never heavily golden");
    expect(STUDIO_STYLES.v2.studioStyle).toContain("6½ to 7 heads tall");
  });

  it("keeps the LAYER 1 header and negative prompt for both versions", () => {
    for (const style of Object.values(STUDIO_STYLES)) {
      expect(style.studioStyle).toContain("LAYER 1 — LILLY STORYBOOKS STUDIO STYLE");
      expect(style.studioStyle).toContain("never changes");
      expect(style.masterPrompt).toContain("Avoid photorealism");
      expect(style.negativePrompt.length).toBeGreaterThan(0);
    }
  });
});
