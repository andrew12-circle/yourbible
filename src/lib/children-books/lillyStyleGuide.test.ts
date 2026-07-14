import { describe, expect, it } from "vitest";
import { getCharacterBible } from "@/lib/children-books/characterBibles";
import { buildPageIllustrationPrompt } from "@/lib/children-books/illustrationPrompt";
import {
  buildLillySystemPrompt,
  LILLY_CHARACTER_MODEL_SHEET,
  LILLY_MASTER_PROMPT,
  LILLY_STUDIO_STYLE,
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
    expect(mara).toContain("dark brown curls");
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
});
