/**
 * AI historical portraits for biblical / scriptural figures.
 * Cached in public `entity-avatars` storage by canonical slug.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { trimStr } from "./publicFigureEnrich.ts";

export const BIBLICAL_PORTRAIT_MODEL = "gemini-2.0-flash-preview-image-generation";
const BUCKET = "entity-avatars";

type FigureProfile = {
  canonical: string;
  slug: string;
  promptHint: string;
};

const FIGURES: FigureProfile[] = [
  {
    canonical: "Abraham",
    slug: "abraham",
    promptHint:
      "elderly Bronze Age Near Eastern patriarch, Semitic features, weathered dignified face, simple ancient robes, warm desert light",
  },
  {
    canonical: "Moses",
    slug: "moses",
    promptHint:
      "elderly Hebrew leader, Bronze/Iron Age Near East, strong lined face, long gray beard, simple ancient Hebrew garments, no tablets or props",
  },
  {
    canonical: "Paul",
    slug: "paul",
    promptHint:
      "1st-century Jewish-Roman man, middle-aged apostle, Mediterranean features, short dark hair and beard, plain Roman-era tunic",
  },
  {
    canonical: "Peter",
    slug: "peter",
    promptHint:
      "1st-century Galilean fisherman, stocky build, sun-weathered face, short dark beard, simple wool tunic, working-class Mediterranean look",
  },
  {
    canonical: "David",
    slug: "david",
    promptHint:
      "Iron Age Israelite king as a young-to-middle-aged man, ruddy Mediterranean complexion, shepherd-king bearing, simple royal headband not European crown",
  },
  {
    canonical: "Joseph",
    slug: "joseph",
    promptHint:
      "Bronze Age Egyptian-era Hebrew man, well-groomed administrator look, fine but ancient Near Eastern/Egyptian-influenced robes",
  },
  {
    canonical: "Mary",
    slug: "mary",
    promptHint:
      "1st-century Galilean Jewish woman, young mother, modest head covering, gentle expression, historically plausible ancient dress",
  },
  {
    canonical: "Jesus",
    slug: "jesus",
    promptHint:
      "1st-century Galilean Jewish teacher, early 30s, Semitic features, shoulder-length dark hair, simple undyed tunic, compassionate expression, no halo",
  },
  {
    canonical: "Noah",
    slug: "noah",
    promptHint:
      "ancient antediluvian patriarch, very elderly Semitic man, long white beard, rugged weathered skin, simple ancient robes",
  },
  {
    canonical: "Daniel",
    slug: "daniel",
    promptHint:
      "exiled Jewish nobleman in Babylon, young adult, dignified bearing, Persian-era Near Eastern court dress adapted for a Hebrew exile",
  },
  {
    canonical: "Elijah",
    slug: "elijah",
    promptHint:
      "Iron Age Hebrew prophet, rugged ascetic, hairy mantle, intense gaze, wilderness-worn ancient garments",
  },
  {
    canonical: "John the Baptist",
    slug: "john-the-baptist",
    promptHint:
      "1st-century Judean ascetic prophet, lean sun-darkened face, camel-hair garment, wild hair, intense eyes",
  },
];

const ALIASES: Record<string, string> = {
  abram: "abraham",
  moshe: "moses",
  "paul the apostle": "paul",
  "apostle paul": "paul",
  saul: "paul",
  "saint paul": "paul",
  "st paul": "paul",
  "st. paul": "paul",
  "simon peter": "peter",
  "apostle peter": "peter",
  "st peter": "peter",
  "st. peter": "peter",
  "saint peter": "peter",
  cephas: "peter",
  "king david": "david",
  "virgin mary": "mary",
  "mary mother of jesus": "mary",
  christ: "jesus",
  "jesus christ": "jesus",
  yeshua: "jesus",
  "john the baptist": "john-the-baptist",
  "john baptist": "john-the-baptist",
};

function normalizeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^st\.?\s+/i, "")
    .replace(/^saint\s+/i, "")
    .replace(/^apostle\s+/i, "")
    .replace(/\s+/g, " ");
}

export function resolveBiblicalFigure(name: string): FigureProfile | null {
  const key = normalizeNameKey(name);
  if (!key) return null;
  const slug = ALIASES[key] ?? key.replace(/\s+/g, "-");
  return FIGURES.find((f) => f.slug === slug || normalizeNameKey(f.canonical) === key) ?? null;
}

export function isBiblicalFigure(name: string): boolean {
  return resolveBiblicalFigure(name) != null;
}

function publicAvatarUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function readCachedPortrait(
  admin: SupabaseClient,
  supabaseUrl: string,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  const size = data.size ?? 0;
  if (size < 512) return null;
  return publicAvatarUrl(supabaseUrl, storagePath);
}

function portraitPrompt(profile: FigureProfile): string {
  return `Create a single realistic historical portrait photograph-style illustration of ${profile.canonical}, based on scholarly reconstructions of how a person from their era and region likely looked.

Visual brief: ${profile.promptHint}

Rules:
- Head-and-shoulders portrait, neutral background, soft natural light
- Historically plausible for ancient Near East / 1st-century Mediterranean — NOT medieval European art, NOT Renaissance painting, NOT cartoon, NOT icon with halo
- No text, no watermark, no modern clothing
- Respectful, dignified, documentary tone`;
}

type GeminiImagePart = {
  inlineData?: { mimeType?: string; data?: string };
  text?: string;
};

async function generatePortraitBytes(profile: FigureProfile): Promise<Uint8Array | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${BIBLICAL_PORTRAIT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: portraitPrompt(profile) }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          temperature: 0.35,
        },
      }),
    },
  );

  if (!res.ok) {
    console.warn("biblical portrait gemini error", profile.slug, res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: GeminiImagePart[] } }>;
  } | null;

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const raw = part.inlineData?.data;
    if (!raw) continue;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.length > 512) return bytes;
  }
  return null;
}

export async function getOrCreateBiblicalPortraitUrl(
  admin: SupabaseClient,
  supabaseUrl: string,
  name: string,
): Promise<string | null> {
  const profile = resolveBiblicalFigure(name);
  if (!profile) return null;

  const storagePath = `biblical/${profile.slug}.webp`;

  const cached = await readCachedPortrait(admin, supabaseUrl, storagePath);
  if (cached) return cached;

  const bytes = await generatePortraitBytes(profile);
  if (!bytes) return null;

  const { error } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) {
    console.warn("biblical portrait upload failed", profile.slug, error.message);
    return null;
  }

  return publicAvatarUrl(supabaseUrl, storagePath);
}

export function biblicalFigureBio(name: string): string | undefined {
  const profile = resolveBiblicalFigure(name);
  if (!profile) return undefined;
  return `${profile.canonical} — a central figure in Scripture. Portrait is an AI reconstruction based on historical and archaeological context for their era, not a claimed likeness.`;
}

export type BiblicalPortraitSource = "ai_portrait";

export function trimPortraitName(name: string): string | undefined {
  return trimStr(name);
}
