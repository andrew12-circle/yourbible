import { describe, expect, it } from "vitest";
import {
  CHARACTER_REFERENCE_ASSETS,
  missingCharacterReferences,
  resolveSceneReferenceImages,
  studioAnchorCoveredCharacterIds,
  STUDIO_STYLE_ANCHOR,
  type StorybookCharacterId,
} from "@/lib/children-books/characterReferenceAssets";
import {
  generationFingerprint,
  PROMPT_VERSION,
  type GenerationFingerprintInput,
} from "@/lib/children-books/generationFingerprint";
import { validateGenerationRequest } from "@/lib/children-books/generationValidation";
import {
  buildClosingGenerationRequest,
  buildCoverGenerationRequest,
  buildPageGenerationRequest,
} from "@/lib/children-books/generationRequest";
import { buildPageIllustrationPrompt } from "@/lib/children-books/illustrationPrompt";
import {
  findChildrenBook,
  type ChildrenBook,
  type ChildrenBookPage,
} from "@/lib/children-books/storybook";

const FAMILY = ["lilly", "tish", "andrew", "winston"] as StorybookCharacterId[];
const LILLY_SHEET = CHARACTER_REFERENCE_ASSETS.lilly.referenceImagePaths[0]!;

function baseFingerprint(): GenerationFingerprintInput {
  return {
    bookSlug: "kingdom-invitation",
    imageKind: "page",
    pageNumber: 1,
    studioStyleVersion: "v3",
    worldBibleVersion: "v2",
    promptVersion: PROMPT_VERSION,
    sanitizerVersion: "v1",
    characterReferenceVersions: { studio: "v1", lilly: "v1" },
    prompt: "scene prompt",
    model: "gpt-image-2",
    quality: "high",
    size: "1024x1536",
  };
}

describe("reference-image resolution", () => {
  it("sends the anchor first and a dedicated heroine sheet after it", () => {
    const refs = resolveSceneReferenceImages({
      heroId: "lilly",
      presentCharacterIds: ["lilly", "liora"],
    });
    expect(refs[0]!.role).toBe("studio-style");
    expect(refs[0]!.path).toBe(STUDIO_STYLE_ANCHOR.path);
    // Lilly's identity is carried by the shared family/anchor plate…
    expect(refs[0]!.path).toBe(LILLY_SHEET);
    // …while Liora has her own dedicated sheet sent after the anchor.
    expect(refs.some((r) => r.characterId === "liora")).toBe(true);
  });

  it("covers Lilly, Tish, Andrew and Winston via the shared anchor plate", () => {
    expect(missingCharacterReferences(FAMILY)).toEqual([]);
    const refs = resolveSceneReferenceImages({ heroId: "lilly", presentCharacterIds: FAMILY });
    expect(refs.some((r) => r.role === "studio-style")).toBe(true);
    const covered = studioAnchorCoveredCharacterIds();
    for (const id of FAMILY) expect(covered).toContain(id);
  });

  it("keeps at least one approved image for every registered character", () => {
    for (const id of Object.keys(CHARACTER_REFERENCE_ASSETS) as StorybookCharacterId[]) {
      expect(CHARACTER_REFERENCE_ASSETS[id].referenceImagePaths.length).toBeGreaterThan(0);
    }
  });
});

describe("generation fingerprint (cache busting)", () => {
  it("is deterministic for identical inputs", () => {
    expect(generationFingerprint(baseFingerprint())).toBe(generationFingerprint(baseFingerprint()));
  });

  it("changes when the studio style version changes", () => {
    const a = generationFingerprint(baseFingerprint());
    const b = generationFingerprint({ ...baseFingerprint(), studioStyleVersion: "v2" });
    expect(a).not.toBe(b);
  });

  it("changes when a character asset version changes", () => {
    const a = generationFingerprint(baseFingerprint());
    const b = generationFingerprint({
      ...baseFingerprint(),
      characterReferenceVersions: { studio: "v1", lilly: "v2" },
    });
    expect(a).not.toBe(b);
  });

  it("changes when the world/prompt/sanitizer version changes", () => {
    const a = generationFingerprint(baseFingerprint());
    expect(generationFingerprint({ ...baseFingerprint(), worldBibleVersion: "v9" })).not.toBe(a);
    expect(generationFingerprint({ ...baseFingerprint(), promptVersion: "v9" })).not.toBe(a);
    expect(generationFingerprint({ ...baseFingerprint(), sanitizerVersion: "v9" })).not.toBe(a);
  });
});

describe("pre-generation validation", () => {
  it("passes when the studio anchor and all references are present", () => {
    const refs = resolveSceneReferenceImages({ heroId: "lilly", presentCharacterIds: ["lilly"] });
    const result = validateGenerationRequest({
      sceneText: "Lilly stands in bright clean daylight.",
      heroName: "Lilly",
      presentCharacterIds: ["lilly"],
      resolvedReferences: refs,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when no studio-style anchor is supplied", () => {
    const result = validateGenerationRequest({
      sceneText: "Lilly stands in bright clean daylight.",
      heroName: "Lilly",
      presentCharacterIds: ["lilly"],
      resolvedReferences: [{ role: "character", characterId: "lilly", path: "x.png", version: "v1" }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/studio-style anchor/i);
  });

  it("fails when the scene text still contains a forbidden term", () => {
    const refs = resolveSceneReferenceImages({ heroId: "lilly", presentCharacterIds: ["lilly"] });
    const result = validateGenerationRequest({
      sceneText: "Lilly at golden hour with warm light.",
      heroName: "Lilly",
      presentCharacterIds: ["lilly"],
      resolvedReferences: refs,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/forbidden term/i);
  });
});

describe("storybook generation requests use the reference-image workflow", () => {
  const book = findChildrenBook("kingdom-invitation")!;

  it("page generation attaches the anchor + heroine identity and version metadata", () => {
    const req = buildPageGenerationRequest(book, book.pages[0]!, 1);
    expect(req.referenceImages.length).toBeGreaterThanOrEqual(1);
    expect(req.referenceImages[0]!.role).toBe("studio-style");
    // Heroine identity is carried by the shared anchor plate.
    expect(req.referenceImages[0]!.path).toBe(LILLY_SHEET);
    expect(req.versionMetadata.characterReferenceVersions.studio).toBe("v1");
    expect(req.versionMetadata.characterReferenceVersions.lilly).toBe("v1");
    expect(req.versionMetadata.studioStyleVersion).toBe("v3");
    expect(req.validation.ok).toBe(true);
  });

  it("cover generation uses the reference-image workflow", () => {
    const req = buildCoverGenerationRequest(book);
    expect(req.imageKind).toBe("cover");
    expect(req.referenceImages[0]!.role).toBe("studio-style");
    expect(req.referenceImages[0]!.path).toBe(LILLY_SHEET);
    expect(req.versionMetadata.characterReferenceVersions.lilly).toBe("v1");
  });

  it("closing generation uses the reference-image workflow", () => {
    const req = buildClosingGenerationRequest(book);
    expect(req.imageKind).toBe("closing");
    expect(req.referenceImages[0]!.role).toBe("studio-style");
    expect(req.referenceImages[0]!.path).toBe(LILLY_SHEET);
    expect(req.versionMetadata.characterReferenceVersions.lilly).toBe("v1");
  });

  it("resolves all four family references on a family page", () => {
    const familyBook: ChildrenBook = { ...book, castIds: ["tish", "andrew", "winston"] };
    const page: ChildrenBookPage = { ...book.pages[0]!, presentCharacterIds: FAMILY };
    const req = buildPageGenerationRequest(familyBook, page, 1);
    expect(req.presentCharacterIds).toEqual(FAMILY);
    expect(req.prompt).toContain("CHARACTER BIBLE: LILLY");
    expect(req.prompt).toContain("CHARACTER BIBLE: TISH");
    expect(req.prompt).toContain("CHARACTER BIBLE: ANDREW");
    expect(req.prompt).toContain("CHARACTER BIBLE: WINSTON");
    expect(req.prompt).toContain("Lilly, Tish, Andrew, Winston");
    expect(req.validation.ok).toBe(true);
  });
});

describe("composed prompt no longer carries the old conflicting direction", () => {
  const book = findChildrenBook("kingdom-invitation")!;

  it("drops v1 'rounded, expressive character construction'", () => {
    const prompt = buildPageIllustrationPrompt({ book, page: book.pages[0]!, pageNumber: 1 });
    expect(prompt).not.toContain("rounded, expressive character construction");
    expect(prompt).not.toContain("Warm morning or golden-hour light");
    expect(prompt).not.toContain("large expressive eyes");
  });

  it("requires Lilly's short ear-to-jaw curls and forbids long hair", () => {
    const prompt = buildPageIllustrationPrompt({ book, page: book.pages[0]!, pageNumber: 1 });
    expect(prompt).toContain("ears and jaw");
    expect(prompt).toContain("never long flowing princess hair");
    expect(prompt).toContain("short ear-to-jaw-length curls");
    expect(prompt).toContain("long hair on Lilly");
  });

  it("dawn palette is high-key and forbids warm cream / orange cast", () => {
    const page = { ...book.pages[0]!, palette: "dawn" as const };
    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: 1 });
    expect(prompt).toContain("No orange sunrise wash");
    expect(prompt).not.toContain("warm cream");
    expect(prompt).not.toContain("golden sunlight");
  });
});
