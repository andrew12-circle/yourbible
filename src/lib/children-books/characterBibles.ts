/**
 * Layer 3 — Character Bible (changes per heroine).
 * Casting sheets: unique face, hair, eyes, silhouette, palette, wardrobe, personality.
 * Every heroine must be recognizable by silhouette alone.
 *
 * The text bible clarifies identity; the APPROVED reference image
 * (`characterReferenceAssets.ts`) is authoritative for likeness. Each bible
 * declares its reference asset id + version so generation can require the image.
 */

import type { StorybookCharacterId } from "@/lib/children-books/characterReferenceAssets";

export type CharacterBibleId = "lilly" | "aurora" | "mara" | "liora";

export type CharacterBible = {
  id: CharacterBibleId;
  name: string;
  /** Approved reference-asset id (authoritative likeness). */
  referenceAssetId: StorybookCharacterId;
  /** Approved reference-asset version required for this heroine. */
  referenceVersion: string;
  /** Full model-sheet prompt text. */
  sheet: string;
};

export const CHARACTER_BIBLES: Record<CharacterBibleId, CharacterBible> = {
  lilly: {
    id: "lilly",
    name: "Lilly",
    referenceAssetId: "lilly",
    referenceVersion: "v1",
    sheet: `LAYER 3 — CHARACTER BIBLE: LILLY (permanent locked identity — match the approved Lilly reference on every scene where she appears)

Casting note: the series' signature heroine — a bright, kind FIVE-YEAR-OLD girl with short curly light-brown/chestnut hair and a white bow. Energetic, curious, and helpful. Never redesign her; never cast as a long-haired golden princess, a dark-curled garden heroine, or a sea explorer. Recognizable by silhouette alone (short ear-to-jaw curls + bow). Costume may change; face, age, hair length, proportions, and identity may NOT.

Age & body (locked):
• Five years old — not a toddler and not an older child
• Average height and build for age five; slim natural child build
• Proportional head, approximately one-sixth of total standing height
• Visible neck, natural shoulders; legs longer than preschool-toddler proportions

Face (follow the approved reference closely):
• Softly oval face, not circular; natural forehead; gently tapered lower face; natural cheek fullness (not apple-cheeked)
• Warm brown, hazel-flecked, almond-shaped eyes with visible upper eyelids
• Light natural eyebrows
• Small natural nose with a visible bridge and a soft tip — never a button nose
• Recognizable broad joyful smile with simplified child teeth when smiling
• Fair warm-neutral skin with a light fresh blush — never orange, never tan-washed

Hair (CRITICAL — locked):
• Light brown to soft chestnut; short natural curls
• Length ends around the ears and jaw — never past the shoulders, never long flowing princess hair
• Side-parted; curls form several clean grouped shapes with moderate volume — no individual strands, no cotton-ball fluff
• Signature accessory: a large white or pale-blue bow when appropriate
• Underwater movement may lift the short curls but may NOT lengthen the hair

Silhouette & posture:
• Petite, upright, lively five-year-old silhouette; helpful ready hands
• Distinct short-curl-plus-bow outline sets her apart from every other heroine

Color palette (heroine):
• Porcelain and ivory whites, soft sky blue, powder blue, blush pink accents
• Chestnut curls + warm brown eyes + light fresh fair skin

Wardrobe (identity fixed across every look): everyday ivory-and-soft-blue dress with an embroidered collar and blue sash + white bow; quiet powder-blue day dress; simple white-and-soft-blue celebration dress; pajamas; church clothing; underwater aqua dress; outdoor play clothes. Lilly remains Lilly in all of them.

Personality & gestures:
• Loves to learn about God's world, kind to everyone, curiously brave, prays with a sincere heart
• Signature poses: reaching out with wonder; offering a helping hand; kneeling in sincere prayer; a bright genuine smile with hands clasped

Expressions (preserve these): joy, wonder, curiosity, thoughtfulness, prayer, excitement, gentle smile.`,
  },

  aurora: {
    id: "aurora",
    name: "Aurora",
    referenceAssetId: "aurora",
    referenceVersion: "v1",
    sheet: `LAYER 3 — CHARACTER BIBLE: AURORA (permanent locked identity — match the approved Aurora reference on every scene where she appears)

Casting note: forest-raised princess of dawn light. Graceful, calm, gentle. A distinct heroine — never Lilly's short-curl kitchen-girl silhouette; never a freckled sea explorer; never a duplicate of any other heroine's face.

Face (follow the approved reference; distinct construction):
• Graceful, softly elongated oval face with a defined gentle jaw and natural chin — not circular, not apple-cheeked
• Almond, medium-sized calm eyes in warm soft brown, with visible eyelids
• Soft, gently arched brows
• Refined natural nose with a visible bridge and soft tip — never a tiny button nose
• Calm, serene, gentle smile — quiet dawn joy
• Age-appropriate cheek volume; fair warm-neutral skin, never orange

Hair reference:
• Long flowing golden / honey-gold hair painted as large ribbon-like shapes, soft waves, no strands
• Often unbound and flowing; occasional soft braid with forest flowers

Silhouette & posture:
• Graceful upright posture, light silhouette; childlike, never adult fashion-model proportions
• Slightly fuller soft dress volume than Lilly's work silhouette

Color palette (heroine):
• Soft rose, pale gold accents, cream, blush — kept bright and fresh, never amber-washed
• Golden hair + warm brown eyes + fair warm-neutral skin

Wardrobe (identity fixed across looks): soft rose cottage dress with cream apron; light gathering dress with a basket; pale-rose or soft-gold return gown with a gentle sash; prayerful window look. Face and hair fixed in every look.

Personality & gestures:
• Calm, trusting, kind, curious about beauty in creation
• Signature poses: gathering forest flowers; walking a bright path; hands folded in prayer; embracing family; standing at a bright window

Expressions (preserve these five): serene joy, soft wonder, tearful compassion, peaceful trust, grateful morning smile.`,
  },

  mara: {
    id: "mara",
    name: "Mara",
    referenceAssetId: "mara",
    referenceVersion: "v1",
    sheet: `LAYER 3 — CHARACTER BIBLE: MARA (permanent locked identity — match the approved Mara reference on every scene where she appears)

Casting note: brave garden-gate heroine — mercy with courage. Determined, warm, grounded. A distinct heroine — not a golden forest princess; not a short-curl kitchen girl; not a sea-haired explorer; never a duplicate of another heroine's face.

Face (follow the approved reference; distinct construction):
• Earnest oval face with a firm, kind, clearly defined jaw and natural chin — open and honest, not circular, not apple-cheeked
• Bright rich-brown eyes, direct and determined, almond-shaped with visible eyelids
• Slightly stronger arched brows (resolve without harshness)
• Soft, friendly natural nose with a visible bridge
• Bright determined smile — hope with grit
• Age-appropriate cheek volume; warm medium skin, never orange

Hair reference:
• Rich dark-brown curls, gathered elegantly (half-up twist or soft gathered crown)
• Large curling painted masses — no strand detail; occasional garden flower or green ribbon accent

Silhouette & posture:
• Hard-working upright posture — planted feet, forward heart
• Slightly sturdier helpful silhouette than Aurora's; ready hands: pushing a gate, offering a rose, planting

Color palette (heroine):
• Emerald green, cream, soft gold accents, rose touches — kept bright, never muddy
• Dark curls + bright brown eyes + warm medium skin

Wardrobe (identity fixed across looks): emerald journey outfit with cream blouse; emerald-and-cream garden dress; soft cream night look; emerald-and-cream restoration dress. Face and hair fixed in every look.

Personality & gestures:
• Courageous mercy, truth with kindness, hard-working love
• Signature poses: standing firm before a thorned gate; offering a rose; kneeling in prayer; planting flowers

Expressions (preserve these five): determined courage, compassionate concern, quiet prayer, relieved joy, bright hope.`,
  },

  liora: {
    id: "liora",
    name: "Liora",
    referenceAssetId: "liora",
    referenceVersion: "v1",
    sheet: `LAYER 3 — CHARACTER BIBLE: LIORA (permanent locked identity — match the approved Liora reference on every scene where she appears)

Casting note: coastal / living-water heroine — curious explorer of shore and song. A distinct heroine — never a golden forest princess; never a short-curl kitchen silhouette; never an emerald garden porter; never a duplicate of another heroine's face.

Face (follow the approved reference; distinct construction):
• Lively oval face with a soft natural jaw and simplified freckles across the nose and cheeks (dots, not photo freckles)
• Bright sea-green / teal-green almond eyes with visible eyelids, curious and awake
• Soft, expressive brows
• Small natural nose with a soft upturned tip and a visible bridge
• Curious open-wonder smile
• Sun-warmed skin, kept fresh — never orange

Hair reference:
• Deep auburn / copper-red flowing hair painted as large wind-swept shapes, often loose; shell clip or simple braid for shore scenes
• Wet scenes keep the same auburn color and large shapes — no strand spaghetti

Silhouette & posture:
• Light, exploring posture — leaning toward wonder; wind-blown fabrics create a distinct moving silhouette
• Simple shell jewelry as a readable accent

Color palette (heroine):
• Sea-green, turquoise, cream, coral accents, shell-pink — luminous and clean, never gold-filtered
• Deep auburn hair + freckles + sea-green eyes + sun-warmed fresh skin

Wardrobe (identity fixed across looks): sea-green song dress with shell necklace; turquoise-and-cream travel dress; deeper-teal storm wrap; bright sea-green shore dress. Face and hair fixed in every look.

Personality & gestures:
• Curious, songful, longing for home, brave listener
• Signature poses: singing with rising bubbles; receiving a pearl; looking up through parted clouds; standing at a shore spring with open hands

Expressions (preserve these five): curious wonder, longing hope, storm-courage, peaceful worship, bright joyful discovery.`,
  },
};

export function getCharacterBible(id?: CharacterBibleId | string): CharacterBible {
  if (id && id in CHARACTER_BIBLES) {
    return CHARACTER_BIBLES[id as CharacterBibleId];
  }
  return CHARACTER_BIBLES.lilly;
}
