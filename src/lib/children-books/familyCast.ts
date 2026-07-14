/**
 * Lilly's permanent family cast (supporting characters).
 *
 * These are recurring "actors" who appear alongside Lilly across contemporary
 * Lilly Storybooks stories: Mama Tish, Daddy Andrew, and Winston the Airedale
 * Terrier. Unlike heroines (`characterBibles.ts`), they are not castable book
 * leads — they are a fixed family whose identity must never change.
 *
 * Each entry is a text character bible (the strong identity anchor for the
 * text-only generation pipeline) plus the path where its approved master model
 * sheet lives once generated (`characterModelSheets.ts`).
 */

export type FamilyCharacterId = "tish" | "andrew" | "winston";

export type FamilyCharacterKind = "adult" | "animal";

export type FamilyCharacter = {
  id: FamilyCharacterId;
  name: string;
  role: string;
  kind: FamilyCharacterKind;
  /** Full character-bible prompt text (identity anchor). */
  sheet: string;
  /** Approved master model sheet asset path under public/. */
  modelSheetPath: string;
};

export const FAMILY_CHARACTERS: Record<FamilyCharacterId, FamilyCharacter> = {
  tish: {
    id: "tish",
    name: "Tish",
    role: "Mama",
    kind: "adult",
    modelSheetPath: "children-books/character-bibles/tish/model-sheet.png",
    sheet: `CHARACTER BIBLE: TISH — "MAMA" (permanent model — maintain exactly across every illustration)

Role: Lilly's mother. Warm, graceful, joyful, and strong. Never a generic princess — she should clearly resemble the supplied reference photographs.

Body & proportions:
• Adult woman with natural, graceful proportions (about 7½ heads tall)
• Elegant, warm, approachable posture — never fashion-model exaggerated

Face (highest priority — resemble the reference):
• Soft oval face with a gentle, elegant jawline and natural cheeks
• Bright, warm, genuine smile with simplified natural teeth
• Almond eyes, warm and kind, with visible eyelids — light blue
• Soft natural eyebrows; small natural nose with a visible bridge
• Fair skin with a soft watercolor blush — never plastic or airbrushed

Hair reference:
• Long golden-blonde hair in soft natural waves past the shoulders
• Soft center-to-side part; painted as large flowing shapes — no individual strands
• Gentle movement; occasionally a soft loose braid

Silhouette & posture:
• Graceful, upright, motherly silhouette — recognizable at a distance by long blonde waves
• Signature gestures: holding Lilly's hand, an arm around the family, hands folded in prayer

Color palette (character):
• Porcelain white, sky blue, blush pink, soft coral accents
• Golden-blonde hair + light blue eyes + fair skin

Wardrobe (canonical looks):
1. Daily: soft pastel polka-dot or floral sundress with a delicate belt and simple sandals
2. Church: elegant modest dress in sky blue or ivory
3. Garden: light linen dress with a simple apron
4. Cozy home: soft cardigan over a simple day dress

Personality & expressions: warm, graceful, kind, strong. Preserve: joyful smile, tender warmth, gentle concern, peaceful prayer, proud delight.`,
  },

  andrew: {
    id: "andrew",
    name: "Andrew",
    role: "Daddy",
    kind: "adult",
    modelSheetPath: "children-books/character-bibles/andrew/model-sheet.png",
    sheet: `CHARACTER BIBLE: ANDREW — "DADDY" (permanent model — maintain exactly across every illustration)

Role: Lilly's father. Kind, protective, faithful, strong but gentle. Never a generic prince — he should clearly resemble the supplied reference photographs.

Body & proportions:
• Adult man with natural, athletic proportions (about 7½–8 heads tall)
• Relaxed, confident posture; a strong but gentle presence

Face (highest priority — resemble the reference):
• Natural masculine oval face with a defined but soft jawline, clean-shaven
• Friendly, warm smile with simplified natural teeth
• Kind almond eyes with visible eyelids — warm brown
• Natural eyebrows; straight natural nose with a visible bridge
• Warm skin with a soft watercolor tone — never plastic or airbrushed

Hair reference:
• Short, neat dark brown hair with a natural side part; painted as large shapes — no individual strands

Silhouette & posture:
• Broad-shouldered, dependable, fatherly silhouette
• Signature gestures: holding Lilly, a hand on her shoulder, kneeling to a child's height, hands folded in prayer

Color palette (character):
• Lavender / powder-blue gingham, warm taupe and khaki, ivory, brown accents
• Dark brown hair + warm brown eyes + warm skin

Wardrobe (canonical looks):
1. Daily: light gingham button shirt (lavender or blue), khaki chinos, brown belt and loafers
2. Church: a soft blazer over a collared shirt
3. Outdoor: rolled-sleeve shirt with practical trousers
4. Cozy home: a simple sweater

Personality & expressions: kind, protective, faithful, strong. Preserve: warm smile, steady reassurance, playful fun, thoughtful concern, peaceful prayer.`,
  },

  winston: {
    id: "winston",
    name: "Winston",
    role: "the Airedale Terrier",
    kind: "animal",
    modelSheetPath: "children-books/character-bibles/winston/model-sheet.png",
    sheet: `CHARACTER BIBLE: WINSTON — THE AIREDALE TERRIER (permanent model — maintain exactly across every illustration)

Role: the family dog. Loyal, gentle, fun, and protective. Instantly recognizable.

Breed & proportions:
• Airedale Terrier with natural, believable dog proportions — never cartoonish, chibi, or humanized
• Sturdy, athletic build; long bearded muzzle; folded V-shaped ears; alert upright tail

Markings (maintain exactly):
• Tan head, ears, legs, and underside
• A dark black/grizzle "saddle" over the back and upper sides
• A distinct wiry beard and eyebrows; friendly dark eyes
• Coat painted as large wiry shapes — no individual strands or fluffy AI fur

Silhouette & posture:
• Recognizable bearded-terrier silhouette with the black saddle and tan legs
• Playful, protective body language; usually near Lilly

Accessory: a soft light-blue collar or bow tie (optional and tasteful)

Color palette (character): tan, warm taupe, black saddle, with a light-blue accent.

Personality & poses: loyal, gentle, fun, protective. Preserve poses: sitting, standing, play bow, walking, running beside Lilly, and resting at her feet.`,
  },
};

export function getFamilyCharacter(id?: FamilyCharacterId | string): FamilyCharacter | undefined {
  if (id && id in FAMILY_CHARACTERS) {
    return FAMILY_CHARACTERS[id as FamilyCharacterId];
  }
  return undefined;
}

export const FAMILY_CHARACTER_IDS = Object.keys(FAMILY_CHARACTERS) as FamilyCharacterId[];
