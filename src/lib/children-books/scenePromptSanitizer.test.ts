import { describe, expect, it } from "vitest";
import {
  findForbiddenSceneTerms,
  sanitizeScenePrompt,
  SANITIZER_VERSION,
} from "@/lib/children-books/scenePromptSanitizer";

describe("scene prompt sanitizer", () => {
  it("exposes a version (feeds the generation fingerprint)", () => {
    expect(SANITIZER_VERSION).toMatch(/^v\d+$/);
  });

  it("scrubs golden hour and warm/cinematic lighting", () => {
    const out = sanitizeScenePrompt(
      "A castle at golden hour with warm light and cinematic drama.",
    );
    expect(out).not.toMatch(/golden hour/i);
    expect(out).not.toMatch(/warm light/i);
    expect(out).not.toMatch(/cinematic/i);
    expect(out).toContain("clear daylight");
  });

  it("replaces glowing heart patterns, magical glows, sparkles and fairy dust", () => {
    const out = sanitizeScenePrompt(
      "A glowing heart-shaped pattern in the quilt, magical glow, sparkles and fairy dust.",
    );
    expect(out).toContain("soft heart motif");
    expect(out).not.toMatch(/magical glow/i);
    expect(out).not.toMatch(/sparkles/i);
    expect(out).not.toMatch(/fairy dust/i);
  });

  it("shortens Lilly's hair only when the heroine is Lilly", () => {
    const asLilly = sanitizeScenePrompt("Lilly's long flowing hair drifts in the water.", {
      heroName: "Lilly",
    });
    expect(asLilly).not.toMatch(/long,? flowing hair/i);
    expect(asLilly).toContain("short chestnut curls");

    // A different heroine's long hair is left untouched.
    const asLiora = sanitizeScenePrompt("Liora's long flowing hair drifts in the water.", {
      heroName: "Liora",
    });
    expect(asLiora).toContain("long flowing hair");
  });

  it("flags forbidden scene terms for pre-generation validation", () => {
    const hits = findForbiddenSceneTerms("golden hour over a candlelit hall", {});
    expect(hits.some((h) => h.includes("golden hour"))).toBe(true);
    expect(findForbiddenSceneTerms("A bright kitchen in clear daylight", {})).toEqual([]);
  });
});
