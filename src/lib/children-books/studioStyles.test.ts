import { describe, expect, it } from "vitest";
import {
  ACTIVE_STUDIO_STYLE_VERSION,
  getStudioStyle,
  STUDIO_STYLES,
} from "@/lib/children-books/studioStyles";

describe("versioned studio styles", () => {
  it("exposes v1/v2/v3 with the active version set to v3", () => {
    expect(Object.keys(STUDIO_STYLES).sort()).toEqual(["v1", "v2", "v3"]);
    expect(ACTIVE_STUDIO_STYLE_VERSION).toBe("v3");
    expect(STUDIO_STYLES.v1.version).toBe("v1");
    expect(STUDIO_STYLES.v2.version).toBe("v2");
    expect(STUDIO_STYLES.v3.version).toBe("v3");
  });

  it("returns the requested version and falls back to the active version", () => {
    expect(getStudioStyle("v1").version).toBe("v1");
    expect(getStudioStyle("v2").version).toBe("v2");
    expect(getStudioStyle("v3").version).toBe("v3");
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

  it("v3 is the bright/airy 2D-animation direction and forbids warm washes", () => {
    const v3 = STUDIO_STYLES.v3;
    expect(v3.studioStyle).toContain("studioStyle_v3");
    expect(v3.masterPrompt).toContain("2D animation-style");
    expect(v3.studioStyle).toContain("Whites must remain visibly white");
    expect(v3.negativePrompt).toContain("long hair on Lilly");
    expect(v3.negativePrompt).toContain("amber cast");
  });

  it("keeps the LAYER 1 header and negative prompt for every version", () => {
    for (const style of Object.values(STUDIO_STYLES)) {
      expect(style.studioStyle).toContain("LAYER 1 — LILLY STORYBOOKS STUDIO STYLE");
      expect(style.studioStyle).toContain("never changes");
      expect(style.negativePrompt).toContain("photorealism");
      expect(style.negativePrompt.length).toBeGreaterThan(0);
    }
  });
});
