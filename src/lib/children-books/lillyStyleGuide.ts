/** Series heroine — consistent across every Lilly book. */
export const LILLY_HERO_NAME = "Lilly";

/**
 * Master prompt — lead every image generation with this one paragraph.
 * Classic picture book, not AI concept art.
 */
export const LILLY_MASTER_PROMPT = `A timeless, hand-painted children's storybook illustration for a premium hardcover picture book. Stylized, rounded, expressive characters with large kind eyes, simplified facial features, clean ink linework, soft gouache and watercolor rendering, warm nostalgic color palette, cozy European fairy-tale setting, gentle golden-hour lighting, painterly backgrounds, readable compositions, soft cel-style shading, handcrafted traditional illustration feel, elegant but simple, emotionally warm, designed for ages 3–7. Every page should feel like a classic storybook illustration created by a master children's book illustrator, with consistent characters, soft shapes, and enduring charm. Avoid photorealism, CGI, modern concept art, anime, comic-book styling, glossy rendering, or hyper-detailed textures.`;

/** Full art direction — think of this as the series art bible, not a one-off prompt. */
export const LILLY_STORYBOOK_ART_BIBLE = `Lilly Storybook Art Bible

OVERALL STYLE
A timeless, hand-painted children's picture book with the warmth of classic fairy tales. Every illustration should feel like it belongs in a beautifully illustrated hardcover that parents will keep for generations.

Mood: warm, hopeful, innocent, cozy, magical without feeling flashy, peaceful, joyful, simple.

CHARACTER DESIGN
Characters should be stylized rather than realistic. Never photorealistic.

Faces: large expressive eyes, rounded cheeks, small nose, gentle smile, simple eyebrows, soft jawline, clean shapes, youthful proportions.

Hair: painted as large flowing shapes, not individual strands. Soft curls, smooth highlights, simplified masses. Never flyaway hairs, individual strands, or hyper-detailed realism.

Clothing: classic European fairy-tale clothing — linen, cotton, aprons, embroidered collars, simple dresses, muted jewel tones. Everything feels handmade.

LINE ART (critical)
Use clean illustration outlines, confident brush lines, slightly varying line weight, soft rounded edges.
Avoid sketchy lines, comic outlines, painterly edges, fuzzy AI edges.

COLOR
Warm storybook palette: cream, soft blue, dusty rose, sage green, warm brown, golden sunlight, lavender, muted red. Nothing neon.

LIGHTING
Soft, diffuse, golden hour, window light, candle light, morning light. Never dramatic movie lighting.

BACKGROUNDS
Painterly, simple, not cluttered. Every room cozy, every forest inviting, every castle magical. Backgrounds support characters — they do not compete.

TEXTURE
Paper, watercolor, light gouache, soft brush strokes. No digital texture, glossy rendering, or 3D materials.

COMPOSITION
One clear story moment, one emotional focus, no clutter. A child should understand the illustration in two seconds.

EXPRESSIONS
Very readable: wonder, joy, curiosity, kindness, hope, gentleness. Avoid exaggerated comedy.

PERSPECTIVE
Simple, eye level, easy to understand. No dramatic camera angles.

ENVIRONMENT
European storybook villages, flower gardens, stone cottages, wood beams, fireplaces, rolling hills, church steeples in the distance, forests, creeks, castles, sunsets. Everything feels lived in.

RENDERING
Flat enough to feel illustrated, enough shading to give volume. Never cinematic, hyper-realistic, or movie-poster-like.

CONSISTENCY RULES
Every book uses identical eye style, face proportions, brushwork, color palette, lighting philosophy, line weight, and illustration language. A child should recognize a Lilly book immediately.

CHRISTIAN WORLDVIEW
Wonder from God's creation, love, kindness, prayer, community, and beauty. No magic spells, fairy dust, or fantasy creatures. Prayer is peaceful; miracles are reverent.`;

/** Character model sheet — attach to every prompt when the series heroine appears. */
export const LILLY_CHARACTER_MODEL_SHEET = `LILLY CHARACTER MODEL SHEET (maintain exactly across every illustration)

Identity: Lilly — the Lilly storybook series heroine.

Silhouette: small, youthful, gentle posture, clear readable outline, modest fairy-tale heroine.

Face (front / three-quarter / profile must match):
• Large kind eyes, dark warm brown, simple white highlight dots
• Rounded cheeks, small nose, soft jawline
• Simple curved eyebrows
• Gentle closed or soft open smile
• Youthful proportions — never adult, never photoreal

Hair:
• Soft chestnut brown
• Large flowing painted shapes, side part, soft waves or curls
• Smooth highlight mass on one side — no individual strands

Skin: warm peachy tone, soft watercolor blush on cheeks.

Typical outfit:
• Modest European fairy-tale dress, muted jewel tone (soft blue, dusty rose, or sage)
• White or cream embroidered collar, simple apron optional
• Linen/cotton texture suggested with flat color + soft shadow — not realistic fabric physics

Expressions to preserve: wonder, joy, kindness, hope, gentle sadness, peaceful prayer.

Reference views to keep consistent: front, three-quarter left, profile left, expressions (smile, wonder, prayerful).`;

export const LILLY_NEGATIVE_PROMPT = `Always avoid:
photorealism, CGI, Pixar look, Disney character designs, anime, manga, 3D rendering, Unreal Engine, concept art,
cinematic lighting, HDR, lens flare, dramatic depth of field, hyper-detailed skin, pores, individual hair strands,
plastic textures, AI artifacts, glossy surfaces, modern digital painting, excessive texture, sharp realism,
sketchy lines, comic-book outlines, fuzzy AI edges, neon colors, movie-poster composition, dramatic camera angles,
text, watermarks, logos, distorted hands, extra fingers, blurry faces, duplicate people, cropped heads,
magic spells, fairy dust, wands, fantasy creatures, harsh black backgrounds, visual noise, cluttered compositions.`;

/** @deprecated Use LILLY_STORYBOOK_ART_BIBLE — kept for tests and backward references. */
export const LILLY_STORYBOOK_STYLE_GUIDE = LILLY_STORYBOOK_ART_BIBLE;

export type LillySystemPromptOptions = {
  bookArtDirection?: string;
  heroModelSheet?: string;
};

function localizedLillyModelSheet(heroName: string): string {
  return LILLY_CHARACTER_MODEL_SHEET.replace(/LILLY/g, heroName.toUpperCase()).replace(/Lilly/g, heroName);
}

export function buildLillySystemPrompt(
  heroName?: string,
  options: LillySystemPromptOptions = {},
): string {
  const sections = [LILLY_MASTER_PROMPT, "", LILLY_STORYBOOK_ART_BIBLE];
  const name = heroName?.trim() || LILLY_HERO_NAME;
  const bookArtDirection = options.bookArtDirection?.trim();
  if (bookArtDirection) sections.push("", "BOOK-SPECIFIC ART DIRECTION", bookArtDirection);
  if (name) {
    sections.push("", `HEROINE FOR THIS BOOK: ${name}`, options.heroModelSheet?.trim() || localizedLillyModelSheet(name));
  }
  return sections.join("\n");
}
