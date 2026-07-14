/**
 * Layer 3 — Character Bible (changes per heroine).
 * Casting sheets: unique face, hair, eyes, silhouette, palette, wardrobe, personality.
 * Every heroine must be recognizable by silhouette alone.
 */

export type CharacterBibleId = "lilly" | "aurora" | "mara" | "liora";

export type CharacterBible = {
  id: CharacterBibleId;
  name: string;
  /** Full model-sheet prompt text. */
  sheet: string;
};

export const CHARACTER_BIBLES: Record<CharacterBibleId, CharacterBible> = {
  lilly: {
    id: "lilly",
    name: "Lilly",
    sheet: `LAYER 3 — CHARACTER BIBLE: LILLY (maintain exactly across every illustration)

Casting note: preschool-age heroine of Lilly's Adventures — curious, loving, energetic, still learning self-control. Slightly slimmer silhouette than other series heroines. Never cast as a golden-haired forest princess or freckled sea-princess substitute; Lilly remains herself at home and underwater.

Portrait sheet — front / three-quarter / profile must match:
• Face shape: softly oval, gently tapered chin (not round-apple like Aurora)
• Eyes: warm blue-brown hazel, almond with soft kindness, simple white highlight dots
• Cheeks: soft peach blush, not rose-pink heavy
• Nose: small and neat
• Brows: simple gentle arcs
• Smile: quiet, modest, closed or soft — never dazzling show-smile

Hair reference:
• Soft light-brown to dark-blonde / soft chestnut with warm medium-brown highlights
• Side part; home scenes may show hair loosely down or softly tied; underwater scenes keep the same color in large flowing painted shapes
• Large painted wave shapes — no strands; smooth highlight mass on one side

Silhouette & posture:
• Preschool-age girl proportions — slightly slimmer, humble posture — shoulders soft, helpful hands ready
• Modest fairy-tale child, not court-raised elegance; she does NOT have a mermaid tail

Color palette (heroine):
• Soft blue / aqua adventure dress, dusty cream pajamas (home), warm linen whites
• Light-brown / chestnut hair + hazel eyes + warm peachy skin

Wardrobe (keep face identical across looks):
1. Morning home: soft pajamas at the kitchen table
2. Quiet home / day: soft dusty-blue day dress, embroidered cream collar
3. Underwater adventure: flowing aqua-blue underwater dress with soft pearl details (moves naturally in water; she can breathe underwater as storybook wonder — never explained as magic spells)
4. Prayer / bedtime: day dress or pajamas, kneeling silhouette, folded hands

Personality & gestures:
• Curious, loving, energetic, emotionally expressive, learning patience and gentle words
• Signature poses: waiting at the table; hand over heart while breathing; holding a friend's hand in prayer; anchoring to coral to help someone; offering a helping hand; gentle grateful smile

Expressions (preserve these five): wonder, quiet joy, frustrated pout (childlike, never cruel), hopeful prayer, warm thankfulness.`,
  },

  aurora: {
    id: "aurora",
    name: "Aurora",
    sheet: `LAYER 3 — CHARACTER BIBLE: AURORA (maintain exactly across every illustration)

Casting note: forest-raised princess of dawn light. Graceful, calm, rose-soft. Never chestnut kitchen-girl; never freckled sea explorer.

Portrait sheet — front / three-quarter / profile must match:
• Face shape: softly rounded, youthful apple cheeks, graceful oval
• Eyes: large kind eyes in warm soft brown, gentle wide wonder
• Cheeks: soft rose blush
• Nose: tiny and delicate
• Brows: soft arched
• Smile: calm, gentle, serene — quiet dawn joy

Hair reference:
• Long flowing golden / honey-gold hair
• Large painted ribbon-like shapes, soft waves, no strands
• Often unbound and flowing; occasional soft braid with forest flowers
• Smooth luminous highlight mass catching morning light

Silhouette & posture:
• Graceful upright posture, light floating silhouette
• Elegant but still childlike — never adult fashion-model proportions
• Slightly fuller soft dress volume than Lilly's work silhouette

Color palette (heroine):
• Light pink, dawn-gold, soft rose, cream
• Golden hair + rose cheeks + warm peach skin

Wardrobe (3–4 looks):
1. Forest cottage: soft rose-pink simple dress, cream apron, barefoot or soft slippers
2. Gathering flowers: light pink dress with flower basket, woodland blooms in hair
3. Castle return: dawn-gold or soft rose gown, gentle sash, no glitter excess
4. Prayer / closing: same gown, peaceful folded hands at a sunlit window

Personality & gestures:
• Calm, trusting, kind, curious about beauty in creation
• Signature poses: gathering forest flowers; walking a sunlit path; hands folded in prayer; embracing family; standing at dawn window in soft light

Expressions (preserve these five): serene joy, soft wonder, tearful compassion, peaceful trust, grateful dawn smile.`,
  },

  mara: {
    id: "mara",
    name: "Mara",
    sheet: `LAYER 3 — CHARACTER BIBLE: MARA (maintain exactly across every illustration)

Casting note: brave garden-gate heroine — mercy with courage. Determined, warm, grounded. Not a golden forest princess; not a blue-apron kitchen girl; not a sea-haired explorer.

Portrait sheet — front / three-quarter / profile must match:
• Face shape: warmly rounded with a firm, kind jaw — open and earnest
• Eyes: bright rich brown, direct and determined, kind highlight dots
• Cheeks: warm peach-rose
• Nose: soft and friendly
• Brows: slightly stronger arcs (resolve without harshness)
• Smile: bright determined smile — hope with grit

Hair reference:
• Rich dark brown curls, gathered elegantly (half-up twist or soft gathered crown)
• Large curling painted masses — no strand detail
• Occasional garden flower or green ribbon accent

Silhouette & posture:
• Hard-working upright posture — planted feet, forward heart
• Slightly sturdier helpful silhouette than Aurora's floating grace
• Ready hands: pushing a gate, offering a rose, planting

Color palette (heroine):
• Emerald green, cream, soft gold accents, rose touches
• Dark curls + bright brown eyes + warm medium skin

Wardrobe (3–4 looks):
1. Journey: emerald skirt, cream blouse, simple cloak, sturdy shoes
2. Garden gate: emerald-and-cream dress with gold sash, apron optional
3. Night intercession: soft cream night dress / shawl at a garden window
4. Restoration ending: emerald-and-cream celebration dress with gold accents, garden motifs

Personality & gestures:
• Courageous mercy, truth with kindness, hard-working love
• Signature poses: standing firm before a thorned gate; offering a glowing rose; kneeling in moonlight prayer; planting flowers beside a restored heart

Expressions (preserve these five): determined courage, compassionate concern, quiet prayer, relieved joy, bright hope.`,
  },

  liora: {
    id: "liora",
    name: "Liora",
    sheet: `LAYER 3 — CHARACTER BIBLE: LIORA (maintain exactly across every illustration)

Casting note: coastal / living-water heroine — curious explorer of shore and song. Never golden forest princess; never humble chestnut kitchen silhouette; never emerald garden porter.

Portrait sheet — front / three-quarter / profile must match:
• Face shape: lively oval with soft freckles across nose and cheeks
• Eyes: bright sea-green / teal-green, curious and awake
• Cheeks: sun-warmed peach with freckles (simplified dots — not photo freckles)
• Nose: small upturned suggestion
• Brows: soft, expressive
• Smile: curious open wonder — loves exploring

Hair reference:
• Deep auburn / copper-red flowing hair
• Wind-swept large painted shapes, often loose; shell clip or simple braid for shore scenes
• Wet scenes keep the same auburn color and large shapes — no strand spaghetti

Silhouette & posture:
• Light, exploring posture — leaning forward toward wonder
• Wind-blown fabrics creating a distinct moving silhouette
• Shell jewelry as a readable accent (simple shapes only)

Color palette (heroine):
• Sea-green, turquoise, cream, coral accents, shell-pink
• Deep auburn hair + freckles + sea-green eyes + sunlit warm skin

Wardrobe (3–4 looks):
1. Undersea song: sea-green dress with soft flowing panels, shell necklace
2. Shore journey: turquoise-and-cream travel dress, wind-blown sash, shell bracelet
3. Storm boat: deeper teal wrap, hair windswept, gripping boat edge in faith
4. Living water ending: bright sea-green dress at shore spring, open hands in worship

Personality & gestures:
• Curious, songful, longing for home above the waves, brave listener
• Signature poses: singing with rising bubbles; receiving a pearl; looking up through parted clouds; standing at shore spring with open hands

Expressions (preserve these five): curious wonder, longing hope, storm-courage, peaceful worship, bright joyful discovery.`,
  },
};

export function getCharacterBible(id?: CharacterBibleId | string): CharacterBible {
  if (id && id in CHARACTER_BIBLES) {
    return CHARACTER_BIBLES[id as CharacterBibleId];
  }
  return CHARACTER_BIBLES.lilly;
}
