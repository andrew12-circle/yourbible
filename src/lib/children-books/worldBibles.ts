/**
 * Layer 2 — World Bible (changes per story).
 * Setting, palette accents, architecture, and atmosphere.
 * Illustration style stays Layer 1; only the world changes here.
 *
 * Palettes are kept bright, fresh, and high-key: no amber/beige/sepia/orange
 * default washes and no "golden-hour" atmosphere. Bump `WORLD_BIBLE_PROMPT_VERSION`
 * when the world wording changes so cached images can be invalidated.
 */

/** Version of the world-bible wording (feeds the generation fingerprint). */
export const WORLD_BIBLE_PROMPT_VERSION = "v2";

export type WorldBibleId =
  | "european-kingdom"
  | "woodland-dawn"
  | "rose-garden-palace"
  | "coastal-kingdom"
  | "kitchen-coral-reef";

export type WorldBible = {
  id: WorldBibleId;
  name: string;
  sheet: string;
};

export const WORLD_BIBLES: Record<WorldBibleId, WorldBible> = {
  "european-kingdom": {
    id: "european-kingdom",
    name: "European Kingdom",
    sheet: `LAYER 2 — WORLD BIBLE: EUROPEAN KINGDOM (this story only)

Atmosphere: gentle elegance, humble cottage life beside a kind, light-filled palace world.
Palette accents: porcelain and ivory white, pale sky blue, soft stone gray, fresh spring green, blush pink, restrained clean gold. Keep interiors bright and predominantly pale.
Places: pale stone cottages, tidy hearths, village lanes, bakery windows, a small church with clear stained glass, welcoming light-filled palace halls.
Nature: forests and rolling green hills, clear evening stars over cottage steps, bright spring meadows.
Mood: cozy faithfulness, quiet village kindness, celebration without vanity.
Do not drift into underwater coral, deep woodland fairy-wild roses as the main set piece, or bayou wetlands. Keep lighting neutral daylight — no amber or golden-hour wash.`,
  },

  "woodland-dawn": {
    id: "woodland-dawn",
    name: "Woodland Dawn",
    sheet: `LAYER 2 — WORLD BIBLE: WOODLAND DAWN (this story only)

Atmosphere: forests, clear morning air, woodland cottages, pale pinks and fresh sage.
Palette accents: soft blush pink, pale sky blue, forest sage, river silver-blue, clean ivory. Restrained pale gold only as a small accent.
Places: bright castle windows, forest cottages with wood beams, clearings of wildflowers, sparkling streams, clear chapel light, palace halls when the story returns home.
Nature: gentle woodland wildlife (birds, distant deer), roses and forest flowers, light morning mist between trees, clear river light.
Mood: protected childhood, quiet courage, God's watchful morning.
Do not drift into coastal cliffs / coral gardens, dusty-blue kitchen-only worlds, or heavy thorn-gate gothic gardens. Keep lighting neutral morning daylight — no amber or golden-hour wash.`,
  },

  "rose-garden-palace": {
    id: "rose-garden-palace",
    name: "Rose Garden Palace",
    sheet: `LAYER 2 — WORLD BIBLE: ROSE GARDEN PALACE (this story only)

Atmosphere: lush bright gardens, pale historic stone palace, mercy growing where fear saw thorns.
Palette accents: fresh greens, emerald, rose pink, cream, restrained clean gold, cool moonlight silver.
Places: old garden gates, thorn-wrapped iron that softens into heart shapes, rose beds, palace hallways, cool moonlit garden windows, restoration lawns in bloom.
Nature: garden trees, roses with a soft clean glow, vines, dew, restored flower beds.
Architecture: elegant but warm-hearted pale-stone European palace garden — lived-in, bright.
Mood: courage before fear, intercession, hearts made new.
Do not drift into underwater Mediterranean coasts, dusty-blue cottage kitchens, or misty forever-forest cabins. Keep night scenes cool and gentle — never brown or amber.`,
  },

  "coastal-kingdom": {
    id: "coastal-kingdom",
    name: "Coastal Kingdom",
    sheet: `LAYER 2 — WORLD BIBLE: COASTAL KINGDOM (this story only)

Atmosphere: sea cliffs, luminous turquoise water, coral gardens, wind-blown fabrics, clear bright light.
Palette accents: crystal turquoise, sea-green, coral, cream, pearl white, pale sky blue.
Places: bright coral rooms under gentle rays, shorelines where ocean meets garden springs, small boats on clear waves, cliff lookouts, pearl-glow shallows.
Nature: bubbles like musical notes, clear springs at the shore, soft sea plants, pale sky meeting clean water.
Mood: longing song, listening through storms, living water and worship.
Do not drift into inland European cottage kitchens, misty woodland-only settings, or locked rose thorn courts. Water must feel luminous and clean — never dark teal or gold-filtered.`,
  },

  "kitchen-coral-reef": {
    id: "kitchen-coral-reef",
    name: "Kitchen & Coral Reef",
    sheet: `LAYER 2 — WORLD BIBLE: KITCHEN & CORAL REEF (this story only)

Atmosphere: two linked worlds — a bright morning family kitchen full of pancakes and family love, then a luminous tropical underwater reef full of wonder. The ocean feels alive and majestic but never dark or frightening.
Palette accents: white and pale-blue kitchen in bright open-window daylight; underwater crystal turquoise, pink coral, lavender, pale clean sunbeams, pearl white, sea-green.
Places: a lived-in family kitchen with pale walls and sunny windows; a glowing tropical reef; an underwater palace with soft blue-and-pearl light; a calm shipwreck among coral; a pearly seashell as the gentle transition token.
Nature: schools of silver fish, sea turtles, soft seaweed, clear currents that can rush then settle, bubbles, diamond-shimmer surface light from above.
Mood: patience, gentle voices, adventure with safety, friendship, rescue, grace after mistakes.
Supporting cast continuity (original storybook designs — never copy any film frame or studio character sheet):
• Ariel — young mermaid friend with long flowing red hair, sea-green tail, lavender shell-inspired top, bright blue-green eyes; energetic, affectionate, sometimes impatient
• Mama — the established Tish likeness: loving and firm at the stove
• Daddy — the established Andrew likeness: calm, protective, playful; kneels at Lilly's eye level
• Winston — Airedale terrier, black saddle with tan face and legs, expressive eyebrows; comic relief
• King Triton — powerful but gentle underwater king, silver-white beard, crown, royal blue and pearl details, trident as a royal symbol not a magic weapon
• Sebastian — small bright-red crab with expressive eyes and dramatic humorous gestures
• Flounder — small yellow-and-blue tropical fish with a round friendly face
• Baby sea turtle — consistent shell markings through the rescue; mother turtle appears later
Props continuity: identical pearly seashell (kitchen transition); identical antique golden compass with carved lid message
Do not drift into misty woodland cottages, thorn-gate rose courts, or dark stormy seas. Keep the kitchen in clean daylight — no amber kitchen wash — and the water luminous and clean.`,
  },
};

export function getWorldBible(id?: WorldBibleId | string): WorldBible {
  if (id && id in WORLD_BIBLES) {
    return WORLD_BIBLES[id as WorldBibleId];
  }
  return WORLD_BIBLES["european-kingdom"];
}
