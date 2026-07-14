/**
 * Layer 1 — Studio Style, versioned.
 *
 * Think like an animation studio: the Studio Style is the global visual
 * language shared by every Lilly Storybooks illustration. It is versioned so
 * the look can be improved over time (studioStyle_v1 → studioStyle_v2) and the
 * whole library regenerated while each heroine's identity (Layer 3 —
 * `characterBibles.ts`) and each story's world (Layer 2 — `worldBibles.ts`)
 * stay fixed.
 *
 * A book pins a `studioStyleVersion`; when unset it uses
 * `ACTIVE_STUDIO_STYLE_VERSION`. Bump the active version (or a book's pin) and
 * regenerate — the character and world bibles are preserved.
 */

export type StudioStyleVersion = "v1" | "v2";

export type StudioStyle = {
  version: StudioStyleVersion;
  /** Short lead paragraph prepended to every generation request. */
  masterPrompt: string;
  /** Full Layer 1 visual language (never changes within a version). */
  studioStyle: string;
  /** Things to always avoid for this version. */
  negativePrompt: string;
};

/**
 * studioStyle_v1 — the original Lilly Storybooks visual language.
 * Kept verbatim for rollback and for books still pinned to v1.
 */
const STUDIO_STYLE_V1: StudioStyle = {
  version: "v1",
  masterPrompt: `A timeless, hand-painted children's storybook illustration for a premium hardcover picture book in the Lilly Storybooks studio style. Stylized, rounded, expressive characters with clean ink linework, soft gouache and watercolor rendering, soft cel-style shading, warm optimistic lighting, large readable shapes, painterly backgrounds, and a premium hardcover storybook feel for ages 3–7. Avoid photorealism, CGI, modern concept art, anime, comic-book styling, glossy rendering, or hyper-detailed textures.`,
  studioStyle: `LAYER 1 — LILLY STORYBOOKS STUDIO STYLE (studioStyle_v1 — never changes within this version)

Bright, airy palette with luminous whites and pastel skies.
Traditional hand-painted storybook illustration.
Clean, expressive ink linework.
Soft cel-style shading.
Watercolor / gouache backgrounds.
Rounded, expressive character construction.
Elegant, simplified anatomy.
Warm morning or golden-hour light.
Optimistic, joyful mood.
Large readable shapes.
Consistent page layouts.
Premium hardcover storybook aesthetic.

OVERALL FEEL
A timeless children's picture book parents keep for generations. Warm, hopeful, innocent, cozy, magical without flashiness, peaceful, joyful, simple. Designed for ages 3–7.

CHARACTER LANGUAGE (studio-wide — not one heroine's identity)
Stylized, never photorealistic. Large expressive eyes, simplified features, soft jawlines, youthful proportions. Hair as large painted shapes, never individual strands. Clothing suggested with flat color and soft shadow — not realistic fabric physics.

LINE ART
Clean illustration outlines, confident brush lines, slightly varying line weight, soft rounded edges. Avoid sketchy lines, comic outlines, painterly fuzzy edges, or AI edge noise.

LIGHTING
Soft, diffuse golden hour, window light, candle light, or morning light. Never dramatic movie lighting.

BACKGROUNDS
Painterly and simple. Support characters — do not compete. No clutter.

TEXTURE
Paper, watercolor, light gouache, soft brush strokes. No digital gloss, CGI materials, or hyper-detailed texture.

COMPOSITION
One clear story moment, one emotional focus. A child should understand the page in two seconds. Simple eye-level perspective. No dramatic camera angles.

EXPRESSIONS
Readable wonder, joy, curiosity, kindness, hope, gentleness. Avoid exaggerated comedy.

RENDERING
Flat enough to feel illustrated, enough shading for volume. Never cinematic, hyper-realistic, or movie-poster-like.

CHRISTIAN WORLDVIEW
Wonder from God's creation, love, kindness, prayer, community, and beauty. No magic spells, fairy dust, or fantasy creatures. Prayer is peaceful; miracles are reverent.`,
  negativePrompt: `Always avoid:
photorealism, CGI, Pixar look, Disney character designs, anime, manga, 3D rendering, Unreal Engine, concept art,
cinematic lighting, HDR, lens flare, dramatic depth of field, hyper-detailed skin, pores, individual hair strands,
plastic textures, AI artifacts, glossy surfaces, modern digital painting, excessive texture, sharp realism,
sketchy lines, comic-book outlines, fuzzy AI edges, neon colors, movie-poster composition, dramatic camera angles,
text, watermarks, logos, distorted hands, extra fingers, blurry faces, duplicate people, cropped heads,
magic spells, fairy dust, wands, fantasy creatures, harsh black backgrounds, visual noise, cluttered compositions,
same face reused across different heroines, generic identical silhouettes, costume-only character differentiation.`,
};

/**
 * studioStyle_v2 — the refined master brief.
 * Brighter, cleaner color (never orange/golden/cinematic), believable child
 * proportions (~6½–7 heads), almond eyes with visible eyelids, and a nose with
 * a visible bridge. This is the active studio style.
 */
const STUDIO_STYLE_V2: StudioStyle = {
  version: "v2",
  masterPrompt: `A timeless, hand-painted children's storybook illustration for a premium hardcover picture book in the Lilly Storybooks studio style. Traditional 2D hand-painted look with clean ink linework, soft cel-style shading, watercolor and gouache backgrounds, minimal texture, and large readable shapes. Bright, fresh, luminous color — porcelain and ivory whites, soft sky blue, robin's-egg blue, blush pink, lavender, fresh spring green, sea-glass green, and very restrained gold accents; never orange, amber, sepia, golden, muddy, or dark. Soft morning, window, or cloud-filtered daylight with pale blue-gray shadows. Believable, stylized characters about 6½–7 heads tall with soft oval faces, gently tapered jaws, almond eyes with visible eyelids, a small nose with a visible bridge, and hair painted as large flowing shapes. Elegant, airy composition with one clear emotional moment and plenty of negative space. Avoid photorealism, CGI, 3D rendering, Pixar styling, anime, comic-book art, movie-poster drama, glossy rendering, and heavy texture.`,
  studioStyle: `LAYER 1 — LILLY STORYBOOKS STUDIO STYLE (studioStyle_v2 — never changes within this version)

PURPOSE
Every illustration must look like it came from the same award-winning illustration studio: timeless, warm, elegant, hand-painted, and suitable for a premium hardcover children's library. The style stays consistent across every book while each heroine, prince, parent, animal, and supporting character keeps a unique identity. Evoke the feeling of beloved classic animated fairy-tale storybooks without imitating or copying any specific copyrighted characters or productions.

OVERALL ART DIRECTION
Traditional 2D hand-painted children's picture book. Hand-drawn illustration. Watercolor and gouache backgrounds. Clean ink linework. Soft cel-style character shading. Minimal texture. Large readable shapes. Elegant composition. Airy, bright, hopeful, timeless. Every page should feel like a treasured hardcover children's book that families keep for generations.

COLOR PHILOSOPHY
Light, fresh, open, luminous. Never muddy, never dark, never orange, never heavily golden. Palette: porcelain white, ivory white, soft sky blue, robin's-egg blue, powder blue, blush pink, lavender, fresh spring green, sea-glass green, crystal turquoise, soft coral accents, muted royal blue, very restrained gold accents. Whites stay white. Do not apply an amber, tan, beige, orange, sepia, or yellow color wash over the illustration. Overall exposure feels bright and clean.

LIGHTING
Morning sunlight, window light, cloud-filtered daylight, open shade, soft reflected light, bright castle interiors, light-filled cottages, clear spring mornings. Never cinematic, never HDR, never dramatic, never orange sunset color grading. Shadows are pale blue-gray or soft lavender-gray.

CHARACTER DESIGN LANGUAGE (studio-wide — not one heroine's identity)
Stylized but believable. Never photorealistic, never doll-like, never chibi, never exaggerated. Believable child or adult anatomy while remaining storybook illustrations.

CHILD PROPORTIONS
Children about ages 4–8 resemble real children. Approximately 6½ to 7 heads tall. No oversized toddler heads. Naturally proportional head. Visible neck. Hands slightly simplified but elegant. Legs longer than toddler proportions.

FACIAL DESIGN
Soft oval face, gently tapered jaw, natural cheeks, visible chin, gentle jawline, natural forehead. Eyes almond-shaped, expressive, medium-large, with visible eyelids — not oversized. Simple brows. Nose with a visible bridge, soft tip, and natural proportions — never a button nose. Mouth expressive but understated; smiles feel genuine.

HAIR
Painted as large flowing shapes — no individual strands, no messy AI hair, no fluffy cotton-ball curls. Use 5–10 major flowing hair masses with soft painted highlights, a readable silhouette, and elegant movement.

CLOTHING
Classic European fairy-tale clothing. Natural fabrics — linen, cotton. Simple embroidery, classic collars, flowing dresses, simple aprons, tasteful royal clothing. No excessive jewelry, glitter, sequins, or modern fashion.

BACKGROUNDS
Painterly, airy, uncluttered. Backgrounds support the story and never compete with characters. Use castles, stone cottages, flower gardens, forests, rolling hills, rivers, coastlines, village squares, churches, mountain meadows, and beautiful skies.

COMPOSITION
One emotional moment, one focal point. Simple eye-level camera. Easy for children to understand. Large readable silhouettes. Plenty of negative space. Avoid clutter.

EXPRESSIONS
Communicate wonder, joy, kindness, curiosity, hope, gentleness, prayer, courage, love, and gratitude. Never exaggerated comedy.

RENDERING
Traditional illustration — not concept art, not digital painting, not CGI, not movie poster, not Pixar, not anime, not comic book. Everything resembles a master illustrator creating a premium hardcover children's book.

CHRISTIAN WORLDVIEW
Wonder comes from God's creation. Prayer is peaceful. Miracles are reverent. Beauty reflects God's goodness. Stories emphasize faith, hope, love, kindness, forgiveness, family, humility, and courage. No occult themes, no spells, no magic wands, no fairy dust, no magical powers. Fantasy elements from fairy-tale-inspired stories are reinterpreted as imaginative storytelling, clearly distinct from the reality of trusting God.

CHARACTER CONSISTENCY
Each heroine has a permanent character model. Never redesign a heroine, never reuse another heroine's face, and never change facial structure, hairstyle, eye shape, age, or silhouette. The heroine is immediately recognizable across every page and recognizable by silhouette alone — never "the same girl with different clothes."`,
  negativePrompt: `Always avoid:
photorealism, CGI, 3D rendering, Pixar styling, anime, manga, comic-book art, modern concept art, movie-poster composition,
heavy painterly texture, excessive brush texture, orange color grading, tan wash, amber wash, sepia, yellow haze, brown shadows,
muddy colors, dark grading, heavy contrast, oversized heads, toddler proportions, round doll faces, apple cheeks, button noses,
huge eyes, tiny chins, plastic skin, glossy rendering, AI hair strands, extra fingers, distorted anatomy, duplicate faces,
identical heroines, visual clutter, heavy ornamentation, busy backgrounds, text, logos, watermarks,
cinematic lighting, HDR, lens flare, dramatic camera angles, orange sunset grading, harsh black backgrounds,
magic spells, fairy dust, wands, fantasy creatures, occult themes,
same face reused across different heroines, generic identical silhouettes, costume-only character differentiation.`,
};

export const STUDIO_STYLES: Record<StudioStyleVersion, StudioStyle> = {
  v1: STUDIO_STYLE_V1,
  v2: STUDIO_STYLE_V2,
};

/** The studio style used when a book does not pin a specific version. */
export const ACTIVE_STUDIO_STYLE_VERSION: StudioStyleVersion = "v2";

/** Resolve a studio style, falling back to the active version. */
export function getStudioStyle(version?: StudioStyleVersion | string): StudioStyle {
  if (version && version in STUDIO_STYLES) {
    return STUDIO_STYLES[version as StudioStyleVersion];
  }
  return STUDIO_STYLES[ACTIVE_STUDIO_STYLE_VERSION];
}
