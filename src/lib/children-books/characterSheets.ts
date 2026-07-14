import {
  CHARACTER_BIBLES,
  type CharacterBible,
  type CharacterBibleId,
} from "@/lib/children-books/characterBibles";
import { LILLY_MASTER_PROMPT, LILLY_NEGATIVE_PROMPT, LILLY_STUDIO_STYLE } from "@/lib/children-books/lillyStyleGuide";

export type CharacterSheetKind = "turnaround" | "expressions" | "outfits";

export type CharacterSheetJob = {
  characterId: CharacterBibleId;
  kind: CharacterSheetKind;
  /** Relative path under public/ */
  relativePath: string;
  prompt: string;
  /** Preferred generation size — landscape for sheet layouts. */
  size: "1536x1024" | "1024x1536";
};

function sheetHeader(character: CharacterBible): string {
  return [
    LILLY_MASTER_PROMPT,
    "",
    LILLY_STUDIO_STYLE,
    "",
    character.sheet,
    "",
    "CHARACTER BIBLE ARTIFACT",
    "This is a model-sheet plate for casting consistency — not a story page.",
    "Plain soft cream watercolor background. No scene, no props clutter, no text, letters, labels, or watermarks.",
    "Same exact girl in every panel. Do not invent a second face.",
  ].join("\n");
}

export function buildCharacterTurnaroundPrompt(character: CharacterBible): string {
  return [
    sheetHeader(character),
    "",
    "SHEET LAYOUT — TURNAROUND (landscape)",
    `Three equal portrait panels of ${character.name} left to right:`,
    "1) Front view — clear face and silhouette",
    "2) Three-quarter view — matching face and hair",
    "3) Side / profile view — matching features and silhouette",
    "Same outfit (primary day dress from the character bible) in all three panels.",
    "Even lighting, model-sheet clarity, large readable shapes.",
    "",
    "NEGATIVE PROMPT",
    LILLY_NEGATIVE_PROMPT,
    "text, labels, panel numbers, arrows, charts, multiple different girls.",
  ].join("\n");
}

export function buildCharacterExpressionsPrompt(character: CharacterBible): string {
  return [
    sheetHeader(character),
    "",
    "SHEET LAYOUT — FIVE EXPRESSIONS (landscape)",
    `Five bust / head-and-shoulders portraits of ${character.name} in a tidy row or 2+3 grid:`,
    "1) Wonder",
    "2) Quiet joy / gentle smile",
    "3) Soft sadness or compassion",
    "4) Peaceful prayerful face",
    "5) Hopeful gratitude",
    "Same hair, face shape, eyes, and skin across every panel. Only expression changes.",
    "Shoulders and collar of her primary outfit visible.",
    "",
    "NEGATIVE PROMPT",
    LILLY_NEGATIVE_PROMPT,
    "text, labels, panel numbers, different hairstyles between panels, different faces.",
  ].join("\n");
}

export function buildCharacterOutfitsPrompt(character: CharacterBible): string {
  return [
    sheetHeader(character),
    "",
    "SHEET LAYOUT — OUTFITS & SIGNATURE POSES (landscape)",
    `Three or four full-body figures of ${character.name} side by side, each in a different wardrobe from her character bible.`,
    "Keep identical face, hair color, eye color, and silhouette language in every figure.",
    "Include at least two of her signature poses from the character bible.",
    "Show hair reference consistency and her heroine color palette clearly.",
    "Clean spacing, fashion-sheet clarity, no story background scenery.",
    "",
    "NEGATIVE PROMPT",
    LILLY_NEGATIVE_PROMPT,
    "text, labels, racks, mirrors, different faces, crowded backgrounds.",
  ].join("\n");
}

const KIND_BUILDERS: Record<
  CharacterSheetKind,
  (character: CharacterBible) => string
> = {
  turnaround: buildCharacterTurnaroundPrompt,
  expressions: buildCharacterExpressionsPrompt,
  outfits: buildCharacterOutfitsPrompt,
};

export function listCharacterSheetJobs(ids?: CharacterBibleId[]): CharacterSheetJob[] {
  const selected = ids?.length
    ? ids.map((id) => CHARACTER_BIBLES[id])
    : Object.values(CHARACTER_BIBLES);

  const kinds: CharacterSheetKind[] = ["turnaround", "expressions", "outfits"];
  const jobs: CharacterSheetJob[] = [];

  for (const character of selected) {
    for (const kind of kinds) {
      jobs.push({
        characterId: character.id,
        kind,
        relativePath: `children-books/character-bibles/${character.id}/${kind}.png`,
        prompt: KIND_BUILDERS[kind](character),
        size: "1536x1024",
      });
    }
  }

  return jobs;
}
