/**
 * Layer 3 — Character Bible (changes per heroine).
 * Casting sheets: unique face, hair, eyes, silhouette, palette, wardrobe, personality.
 * Every heroine must be recognizable by silhouette alone.
 */

export type CharacterBibleId = "lilly" | "aurora" | "mara" | "liora" | "ariel";

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

Casting note: humble kitchen-and-kindness heroine. Quiet confidence. Slightly slimmer silhouette than other series heroines. Never cast as a golden-haired princess or a sea explorer.

Portrait sheet — front / three-quarter / profile must match:
• Face shape: softly oval, gently tapered chin (not round-apple like Aurora)
• Eyes: warm blue-brown hazel, almond with soft kindness, simple white highlight dots
• Cheeks: soft peach blush, not rose-pink heavy
• Nose: small and neat
• Brows: simple gentle arcs
• Smile: quiet, modest, closed or soft — never dazzling show-smile

Hair reference:
• Soft chestnut brown, medium-brown warmth
• Side part, hair often loosely tied back with a simple ribbon or soft knot for work scenes
• Large painted wave shapes — no strands; smooth highlight mass on one side
• Later celebration scenes may show hair partly down in soft waves — same color and part

Silhouette & posture:
• Slightly slimmer, humble posture — shoulders soft, helpful hands ready
• Modest fairy-tale girl, not court-raised elegance

Color palette (heroine):
• Soft blue dress (celebration), dusty cream apron (work), warm linen whites
• Chestnut hair + hazel eyes + warm peachy skin

Wardrobe (3–4 looks):
1. Work: practical cream apron over muted blue dress, simple sleeves rolled
2. Quiet home: soft dusty-blue day dress, embroidered cream collar
3. Celebration: elegant but humble soft-blue gown, ribbon, sparkling simple shoes
4. Prayer: same day dress, shawl optional, kneeling silhouette

Personality & gestures:
• Quiet confidence, kindness first, humility
• Signature poses: sweeping / serving with care; kneeling in morning prayer; offering a helping hand; gentle grateful smile with hands folded

Expressions (preserve these five): wonder, quiet joy, gentle sadness, hopeful prayer, warm thankfulness.`,
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

  ariel: {
    id: "ariel",
    name: "Ariel",
    sheet: `LAYER 3 — CHARACTER BIBLE: ARIEL (maintain exactly across every illustration)

Casting note: cheerful ocean friend and mermaid companion. Bright, curious, tenderhearted, and learning to listen. Never reuse Liora's freckled shore-explorer face; never copy any protected animation-studio character design.

Portrait sheet — front / three-quarter / profile must match:
• Face shape: soft heart-shaped childlike face with gentle rounded cheeks
• Eyes: bright blue-green, wide and expressive, simple white highlight dots
• Cheeks: warm coral-pink blush
• Nose: tiny rounded suggestion
• Brows: lively gentle arcs
• Smile: open, joyful, and sincere — never mischievous or glamorous

Hair reference:
• Long flowing copper-red hair, fuller and more polished than Liora's windswept auburn
• Large ribbon-like painted masses that drift underwater — no individual strands
• Optional small pearl or shell clip, simple and readable

Silhouette & posture:
• Childlike mermaid silhouette with a bright green tail and modest sea-flower top
• Flowing underwater posture, hands expressive, often leaning toward wonder
• Keep proportions innocent, rounded, and age-appropriate

Color palette (heroine):
• Bright sea-green tail, aqua highlights, shell-pink and pearl accents
• Copper-red hair + blue-green eyes + warm peach skin

Wardrobe (3–4 looks):
1. Ocean exploring: bright green mermaid tail, modest shell-pink sea-flower top, pearl bracelet
2. Coral gardens: green tail with aqua fin edges, tiny shell clip, simple pearl necklace
3. Prayer / obedience: hands folded near coral or pearls, softened expression
4. Beach farewell: resting near the shore with a gift shell, sunset light on hair and tail

Personality & gestures:
• Cheerful, curious, affectionate, quick to want beautiful things, learning obedience and love
• Signature poses: waving from a smooth rock; swimming beside Lilly through coral; gently releasing a seahorse; folding hands in prayer; offering a shell

Expressions (preserve these five): bright welcome, wide wonder, disappointed self-control, prayerful listening, peaceful obedience.`,
  },
};

export function getCharacterBible(id?: CharacterBibleId | string): CharacterBible {
  if (id && id in CHARACTER_BIBLES) {
    return CHARACTER_BIBLES[id as CharacterBibleId];
  }
  return CHARACTER_BIBLES.lilly;
}
