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
  | "kitchen-coral-reef"
  | "arendelle-castle";

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

  "arendelle-castle": {
    id: "arendelle-castle",
    name: "Arendelle Castle & Fjord",
    sheet: `LAYER 2 — WORLD BIBLE: ARENDELLE CASTLE & FJORD (this story only)

Atmosphere: a grand, welcoming snow-crowned castle rising high above a calm mountain fjord. Crisp clear winter air, bright and airy, never gloomy. The castle feels majestic yet lived-in, safe, and full of family love.
Palette accents: porcelain and snow white, pale sky blue, powder blue, ice blue, sea-glass teal, pale stone gray, soft lavender, blush pink, and limited clean gold accents. Whites and snow must stay truly white; shadows cool-neutral. At least 40% of most scenes should be white snow, pale stone, open sky, or light negative space.
Places (the treasure-hunt map): tall castle towers with waving banners; a snowy courtyard with wide stone steps down to the fjord; bright grand halls with tall arched windows; a warm royal kitchen with copper pots and pale walls; a two-story library with a rotating/moving bookshelf; an armory of polished shields and helmets; a walled winter garden where a few flowers bloom beneath the snow; a music room with an old wooden music box; a clock tower holding an enormous grandfather clock; a hidden winding stone staircase behind a tapestry that leads deep beneath the castle; a deep lantern-lit stone passage; a treasure chamber behind an ancient handleless gold door.
Nature: snow-dusted pine mountains, a glassy blue fjord, gentle drifting snowflakes, clear pale-blue sky, distant sailing ships, small friendly birds.
Mood: joyful welcome, playful dress-up and hide-and-seek, tender remembering, gratitude, courage, and the discovery that God's wisdom and a family's love are the greatest treasure.
Supporting cast continuity (ORIGINAL storybook interpretations — never copy any film frame, poster, or studio character design):
• Anna — cheerful, warm young woman; strawberry-blonde/auburn hair in two neat braids; freckles; teal-and-black bodice, black skirt, and teal cape as her everyday outfit; bubbly and affectionate
• Elsa — gentle, graceful older sister; platinum-blonde hair in a soft side braid; calm kind eyes; an elegant ice-blue gown as her everyday outfit; warm and reassuring
• Olaf — small friendly snowman: three round white snow segments, two thin twig arms, a stubby carrot nose, three dark round "coal" buttons, three little twig hairs, big goofy happy smile; gentle comic relief
• Sven — large friendly reindeer: warm brown coat, tan face and muzzle, small branching antlers, big expressive dark eyes; loyal and playful
• Kristoff — kind young mountain man; tousled blond hair; sturdy tan-and-brown winter tunic; warm, easygoing laugh
Props continuity: the ribbon-tied parchment (faded blue ribbon) reading "For our beloved daughters, when the time is right"; a little hand-drawn treasure map with a tiny drawn crown; an engraved wooden kitchen spoon; the King's leather Bible with a few verses marked in gold; an engraved metal shield; an old wooden music box; an enormous grandfather clock; matching hand-lanterns; the ancient handleless gold door carved "Only thankful hearts may enter"; a carved gold treasure chest; a handmade dollhouse that is a tiny replica of Arendelle castle; a thick leather book lettered "For Anna and Elsa — Our Greatest Treasure".
Do not drift into underwater coral, misty woodland cottages, thorn-gate rose courts, or modern settings. No visible spirits, spell effects, ice magic, glowing energy, or wands — this is a warm faith story about family, gratitude, and God's Word. Keep every scene bright, clean, and preschool-safe — no amber, sepia, or golden-hour wash; snow stays white.`,
  },
};

export function getWorldBible(id?: WorldBibleId | string): WorldBible {
  if (id && id in WORLD_BIBLES) {
    return WORLD_BIBLES[id as WorldBibleId];
  }
  return WORLD_BIBLES["european-kingdom"];
}
