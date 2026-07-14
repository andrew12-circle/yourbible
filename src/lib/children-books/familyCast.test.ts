import { describe, expect, it } from "vitest";
import {
  FAMILY_CHARACTER_IDS,
  FAMILY_CHARACTERS,
  getFamilyCharacter,
} from "@/lib/children-books/familyCast";

describe("Lilly Storybooks family cast", () => {
  it("defines Tish, Andrew, and Winston as permanent characters", () => {
    expect(FAMILY_CHARACTER_IDS).toEqual(["tish", "andrew", "winston"]);
    expect(FAMILY_CHARACTERS.tish.name).toBe("Tish");
    expect(FAMILY_CHARACTERS.andrew.name).toBe("Andrew");
    expect(FAMILY_CHARACTERS.winston.name).toBe("Winston");
  });

  it("keeps each family member's identity distinct", () => {
    expect(FAMILY_CHARACTERS.tish.sheet).toContain("golden-blonde");
    expect(FAMILY_CHARACTERS.andrew.sheet).toContain("dark brown hair");
    expect(FAMILY_CHARACTERS.winston.kind).toBe("animal");
    expect(FAMILY_CHARACTERS.winston.sheet).toContain("Airedale Terrier");
    expect(FAMILY_CHARACTERS.winston.sheet).toContain("black");
    expect(FAMILY_CHARACTERS.winston.sheet).toContain("tan");

    // Mama and Daddy are adults, not heroines.
    expect(FAMILY_CHARACTERS.tish.kind).toBe("adult");
    expect(FAMILY_CHARACTERS.andrew.kind).toBe("adult");
  });

  it("points each character at an approved model-sheet asset path", () => {
    for (const id of FAMILY_CHARACTER_IDS) {
      expect(FAMILY_CHARACTERS[id].modelSheetPath).toBe(
        `children-books/character-bibles/${id}/model-sheet.png`,
      );
    }
  });

  it("resolves known ids and returns undefined for unknown ids", () => {
    expect(getFamilyCharacter("tish")?.role).toBe("Mama");
    expect(getFamilyCharacter("winston")?.role).toBe("the Airedale Terrier");
    expect(getFamilyCharacter("aurora")).toBeUndefined();
    expect(getFamilyCharacter(undefined)).toBeUndefined();
  });
});
