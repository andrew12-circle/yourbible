/**
 * Layer 2 — World Bible (changes per story).
 * Setting, palette accents, architecture, and atmosphere.
 * Illustration style stays Layer 1; only the world changes here.
 */

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

Atmosphere: gentle elegance, humble cottage life beside a kind palace world.
Palette accents: warm creams, dusty blues, soft firelight gold, muted stone gray, linen white.
Places: stone cottages, warm hearths and fireplaces, village lanes, bakery windows, small church with stained glass, palace halls that feel welcoming not cold.
Nature: forests and rolling hills around the kingdom, evening stars over cottage steps, golden-hour meadows.
Mood: cozy faithfulness, quiet village kindness, celebration without vanity.
Do not drift into underwater coral, deep woodland fairy-wild roses as the main set piece, or bayou wetlands.`,
  },

  "woodland-dawn": {
    id: "woodland-dawn",
    name: "Woodland Dawn",
    sheet: `LAYER 2 — WORLD BIBLE: WOODLAND DAWN (this story only)

Atmosphere: forests, morning mist, woodland cottages, soft pinks and dawn gold.
Palette accents: soft pinks, dawn gold, forest sage, river silver-blue, warm cottage amber.
Places: sunlit castle windows, forest cottages with wood beams, clearings of wildflowers, sparkling streams, chapel light, palace halls when the story returns home.
Nature: woodland wildlife (gentle birds, deer at a distance), roses and forest flowers, morning mist between trees, river light.
Mood: protected childhood, quiet courage, God's watchful dawn.
Do not drift into coastal cliffs / coral gardens, dusty-blue kitchen-only worlds, or heavy thorn-gate gothic gardens as the primary look.`,
  },

  "rose-garden-palace": {
    id: "rose-garden-palace",
    name: "Rose Garden Palace",
    sheet: `LAYER 2 — WORLD BIBLE: ROSE GARDEN PALACE (this story only)

Atmosphere: lush gardens, historic stone palace, mercy growing where fear saw thorns.
Palette accents: warm greens, emerald, rose pink, cream, soft gold, moonlight silver.
Places: old garden gates, thorn-wrapped iron that softens into heart shapes, rose beds, palace hallways at night, moonlit garden windows, restoration lawns in bloom.
Nature: magnolia or garden trees, roses glowing with soft light, vines, dew, restored flower beds.
Architecture: historic Southern-tinged or European palace garden — lived-in stone, elegant but warm.
Mood: courage before fear, intercession, hearts made new.
Do not drift into underwater Mediterranean coasts, dusty-blue cottage kitchens as the main world, or misty forever-forest cabins as the primary set.`,
  },

  "coastal-kingdom": {
    id: "coastal-kingdom",
    name: "Coastal Kingdom",
    sheet: `LAYER 2 — WORLD BIBLE: COASTAL KINGDOM (this story only)

Atmosphere: sea cliffs, turquoise water, coral gardens, wind-blown fabrics, bright Mediterranean light.
Palette accents: turquoise, sea-green, coral, cream, sunlit gold, pearl white.
Places: bright coral rooms under gentle rays, shorelines where ocean meets garden springs, small boats on glowing waves, cliff lookouts, pearl-glow shallows.
Nature: bubbles like musical notes, clear springs at the shore, soft sea plants, warm sky meeting water.
Mood: longing song, listening through storms, living water and worship.
Do not drift into inland European cottage kitchens, misty woodland-only settings, or locked rose thorn courts as the primary world.`,
  },

  "kitchen-coral-reef": {
    id: "kitchen-coral-reef",
    name: "Kitchen & Coral Reef",
    sheet: `LAYER 2 — WORLD BIBLE: KITCHEN & CORAL REEF (this story only)

Atmosphere: two linked worlds — a cozy morning kitchen full of pancakes and family love, then a bright tropical underwater reef full of wonder. The ocean feels alive and majestic but never dark or frightening.
Palette accents: warm kitchen amber and cream sunlight; underwater turquoise, pink coral, lavender, soft gold sunbeams, pearl white, sea-green.
Places: lived-in family kitchen with stove, table, sunny windows; glowing tropical reef; underwater palace with soft blue-and-gold light; calm shipwreck among coral; pearly seashell as the gentle transition token.
Nature: schools of silver fish, sea turtles, soft seaweed, clear currents that can rush then settle, bubbles, diamond-shimmer surface light from above.
Mood: patience, gentle voices, adventure with safety, friendship, rescue, grace after mistakes.
Supporting cast continuity (original storybook designs — never copy any film frame or studio character sheet):
• Ariel — young mermaid friend with long flowing red hair, sea-green tail, lavender shell-inspired top, bright blue-green eyes; energetic, affectionate, sometimes impatient
• Mama — warm, gentle, beautiful mother (established Tish likeness): loving and firm at the stove
• Daddy — calm, protective, playful father; kneels at Lilly's eye level
• Winston — large Airedale terrier, tan face and legs, darker saddle, expressive eyebrows; comic relief
• King Triton — powerful but gentle underwater king, silver-white beard, golden crown, royal blue and sea-gold details, trident as a royal symbol not a magic weapon
• Sebastian — small bright-red crab with expressive eyes and dramatic humorous gestures
• Flounder — small yellow-and-blue tropical fish with a round friendly face
• Baby sea turtle — consistent shell markings through the rescue; mother turtle appears later
Props continuity: identical pearly seashell (kitchen transition); identical antique golden compass with carved lid message
Do not drift into misty woodland cottages, thorn-gate rose courts, or dark stormy seas as the primary look.`,
  },
};

export function getWorldBible(id?: WorldBibleId | string): WorldBible {
  if (id && id in WORLD_BIBLES) {
    return WORLD_BIBLES[id as WorldBibleId];
  }
  return WORLD_BIBLES["european-kingdom"];
}
