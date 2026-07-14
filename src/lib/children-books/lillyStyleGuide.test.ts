import { describe, expect, it } from "vitest";
import { getCharacterBible } from "@/lib/children-books/characterBibles";
import { buildPageIllustrationPrompt } from "@/lib/children-books/illustrationPrompt";
import {
  ACTIVE_STUDIO_STYLE_VERSION,
  buildLillySystemPrompt,
  LILLY_CHARACTER_MODEL_SHEET,
  LILLY_MASTER_PROMPT,
  LILLY_STUDIO_STYLE,
  negativePromptForStyle,
} from "@/lib/children-books/lillyStyleGuide";
import { findChildrenBook } from "@/lib/children-books/storybook";
import { getWorldBible } from "@/lib/children-books/worldBibles";

describe("Lilly Storybooks prompt layers", () => {
  it("composes studio style, world bible, and character bible", () => {
    const system = buildLillySystemPrompt({
      characterId: "lilly",
      worldId: "european-kingdom",
      heroName: "Lilly",
    });
    expect(system).toContain(LILLY_MASTER_PROMPT);
    expect(system).toContain(LILLY_STUDIO_STYLE);
    expect(system).toContain(getWorldBible("european-kingdom").sheet);
    expect(system).toContain(LILLY_CHARACTER_MODEL_SHEET);
    expect(system).toContain("LAYER 1 — LILLY STORYBOOKS STUDIO STYLE");
    expect(system).toContain("LAYER 2 — WORLD BIBLE");
    expect(system).toContain("LAYER 3 — CHARACTER BIBLE: LILLY");
    expect(system).toContain("never changes");
  });

  it("casts each heroine uniquely instead of renaming one model sheet", () => {
    const lilly = buildLillySystemPrompt({ characterId: "lilly", worldId: "european-kingdom" });
    const aurora = buildLillySystemPrompt({ characterId: "aurora", worldId: "woodland-dawn" });
    const mara = buildLillySystemPrompt({ characterId: "mara", worldId: "rose-garden-palace" });
    const liora = buildLillySystemPrompt({ characterId: "liora", worldId: "coastal-kingdom" });

    expect(lilly).toContain("chestnut");
    expect(lilly).not.toContain("golden / honey-gold");
    expect(aurora).toContain("golden / honey-gold");
    expect(aurora).toContain("LAYER 2 — WORLD BIBLE: WOODLAND DAWN");
    expect(aurora).not.toContain("chestnut brown, medium-brown warmth");
    expect(mara).toContain("emerald");
    expect(mara).toContain("dark-brown curls");
    expect(liora).toContain("auburn");
    expect(liora).toContain("COASTAL KINGDOM");
    expect(getCharacterBible("aurora").name).toBe("Aurora");
  });

  it("localizes Cinderella scenes to Lilly in page prompts", () => {
    const book = findChildrenBook("kingdom-invitation")!;
    const page = book.pages[0]!;
    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: 1 });

    expect(prompt).toContain("LAYER 1 — LILLY STORYBOOKS STUDIO STYLE");
    expect(prompt).toContain("LAYER 3 — CHARACTER BIBLE: LILLY");
    expect(prompt).toContain("LAYER 4 — SCENE TO ILLUSTRATE");
    expect(prompt).toContain("Avoid photorealism");
    expect(prompt).not.toContain("Cinderella kneeling");
  });

  it("uses Aurora's character and woodland world on Aurora pages", () => {
    const book = findChildrenBook("aurora-perfect-protection")!;
    const page = book.pages[0]!;
    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: 1 });

    expect(prompt).toContain("CHARACTER BIBLE: AURORA");
    expect(prompt).toContain("WOODLAND DAWN");
    expect(prompt).not.toContain("CHARACTER BIBLE: LILLY");
  });

  it("locks the permanent Lilly model (5yo, short ear-to-jaw curls, white bow, brown eyes)", () => {
    const lilly = getCharacterBible("lilly").sheet;
    expect(lilly).toContain("Five years old");
    expect(lilly).toContain("white bow");
    expect(lilly).toContain("short natural curls");
    expect(lilly).toContain("brown");
    // Locked short hair — never long/shoulder-length princess hair.
    expect(lilly).toContain("ears and jaw");
    expect(lilly).toContain("never long flowing princess hair");
  });

  it("defaults the system prompt to the active studio style version (v3)", () => {
    expect(ACTIVE_STUDIO_STYLE_VERSION).toBe("v3");
    const system = buildLillySystemPrompt({ characterId: "lilly", worldId: "european-kingdom" });
    expect(system).toContain(LILLY_STUDIO_STYLE);
    expect(system).toContain("studioStyle_v3");
    expect(system).not.toContain("studioStyle_v1");
  });

  it("honors an explicit studio style version override", () => {
    const v1 = buildLillySystemPrompt({ characterId: "lilly", styleVersion: "v1" });
    const v2 = buildLillySystemPrompt({ characterId: "lilly", styleVersion: "v2" });
    expect(v1).toContain("studioStyle_v1");
    expect(v1).toContain("golden-hour");
    expect(v2).toContain("studioStyle_v2");
    expect(v2).not.toContain("studioStyle_v1");
  });

  it("anchors supporting family cast when castIds are provided", () => {
    const withCast = buildLillySystemPrompt({
      characterId: "lilly",
      worldId: "european-kingdom",
      castIds: ["tish", "andrew", "winston"],
    });
    const withoutCast = buildLillySystemPrompt({
      characterId: "lilly",
      worldId: "european-kingdom",
    });

    expect(withCast).toContain("SUPPORTING CAST FOR THIS BOOK");
    expect(withCast).toContain('CHARACTER BIBLE: TISH — "MAMA"');
    expect(withCast).toContain('CHARACTER BIBLE: ANDREW — "DADDY"');
    expect(withCast).toContain("CHARACTER BIBLE: WINSTON — THE AIREDALE TERRIER");
    expect(withCast).toContain("match each approved model sheet exactly");

    expect(withoutCast).not.toContain("SUPPORTING CAST FOR THIS BOOK");
    expect(withoutCast).not.toContain("CHARACTER BIBLE: WINSTON");
    // Ignores unknown cast ids without adding an empty section.
    expect(buildLillySystemPrompt({ characterId: "lilly", castIds: ["nobody"] })).not.toContain(
      "SUPPORTING CAST FOR THIS BOOK",
    );
  });

  it("pins a book's studio style version through the page prompt + negative prompt", () => {
    const base = findChildrenBook("kingdom-invitation")!;
    const pinnedV1 = { ...base, studioStyleVersion: "v1" as const };
    const page = base.pages[0]!;

    const promptV1 = buildPageIllustrationPrompt({ book: pinnedV1, page, pageNumber: 1 });
    const promptActive = buildPageIllustrationPrompt({ book: base, page, pageNumber: 1 });

    expect(promptV1).toContain("studioStyle_v1");
    expect(promptV1).toContain(negativePromptForStyle("v1"));
    expect(promptActive).toContain("studioStyle_v3");
    expect(promptActive).toContain(negativePromptForStyle());
  });

  it("uses kitchen-coral world and supporting cast on Lilly and Ariel pages", () => {
    const book = findChildrenBook("lilly-and-ariel-treasure")!;
    const page = book.pages[10]!;
    const prompt = buildPageIllustrationPrompt({ book, page, pageNumber: 11 });

    expect(prompt).toContain("CHARACTER BIBLE: LILLY");
    expect(prompt).toContain("KITCHEN & CORAL REEF");
    expect(prompt).toContain("SUPPORTING CAST");
    expect(prompt).toContain("Ariel");
    expect(getWorldBible("kitchen-coral-reef").name).toBe("Kitchen & Coral Reef");
  });
});
