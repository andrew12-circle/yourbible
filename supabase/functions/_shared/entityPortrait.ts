/**
 * AI-generated portraits (people) and cover art (books/themes).
 * Cached in public `entity-avatars` storage by slug.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { trimStr } from "./publicFigureEnrich.ts";

export const ENTITY_PORTRAIT_MODEL = "gemini-2.0-flash-preview-image-generation";
const BUCKET = "entity-avatars";

type GeminiImagePart = {
  inlineData?: { mimeType?: string; data?: string };
  text?: string;
};

export function slugifyEntityKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^st\.?\s+/i, "")
    .replace(/^saint\s+/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function publicAvatarUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function readCachedImage(
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

async function uploadImage(
  admin: SupabaseClient,
  supabaseUrl: string,
  storagePath: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) {
    console.warn("entity portrait upload failed", storagePath, error.message);
    return null;
  }
  return publicAvatarUrl(supabaseUrl, storagePath);
}

async function generateImageBytes(prompt: string): Promise<Uint8Array | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${ENTITY_PORTRAIT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          temperature: 0.35,
        },
      }),
    },
  );

  if (!res.ok) {
    console.warn("entity portrait gemini error", res.status, await res.text().catch(() => ""));
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

function publicFigurePrompt(name: string, hint?: string): string {
  const context = hint?.trim() ? `\nContext: ${hint.trim()}` : "";
  return `Create a single realistic professional head-and-shoulders portrait photograph of ${name}, a well-known public figure.${context}

Rules:
- Neutral studio background, soft natural light, documentary portrait style
- Recognizable likeness based on widely published public appearances
- No text, no watermark, no logos, no name labels
- Respectful, professional tone`;
}

function topicCoverPrompt(title: string, kind?: string, hint?: string): string {
  const kindLine = kind?.trim() ? ` (${kind})` : "";
  const context = hint?.trim() ? `\nContext: ${hint.trim()}` : "";
  return `Create a single square book-cover style illustration for the topic${kindLine}: "${title}".${context}

Rules:
- Bold readable title typography integrated into the cover design
- Thematic imagery that evokes the subject — not a photo of a real person
- Clean modern design that works as a small thumbnail
- No publisher logos, no barcodes, no watermarks`;
}

export async function tryOpenLibraryCover(title: string): Promise<string | null> {
  const t = title.trim();
  if (!t) return null;
  const url = `https://covers.openlibrary.org/b/title/${encodeURIComponent(t)}-L.jpg`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "YourBible/1.0 (+https://github.com/yourbible; framework enrich)" },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 2048) return null;
    return url;
  } catch {
    return null;
  }
}

export async function getOrCreatePublicFigurePortraitUrl(
  admin: SupabaseClient,
  supabaseUrl: string,
  name: string,
  hint?: string,
): Promise<string | null> {
  const title = trimStr(name);
  if (!title) return null;
  const slug = slugifyEntityKey(title);
  if (!slug) return null;

  const storagePath = `people/${slug}.webp`;
  const cached = await readCachedImage(admin, supabaseUrl, storagePath);
  if (cached) return cached;

  const bytes = await generateImageBytes(publicFigurePrompt(title, hint));
  if (!bytes) return null;
  return uploadImage(admin, supabaseUrl, storagePath, bytes);
}

export async function getOrCreateTopicCoverUrl(
  admin: SupabaseClient,
  supabaseUrl: string,
  title: string,
  kind?: string,
  hint?: string,
): Promise<string | null> {
  const name = trimStr(title);
  if (!name) return null;
  const slug = slugifyEntityKey(name);
  if (!slug) return null;

  const storagePath = `topics/${slug}.webp`;
  const cached = await readCachedImage(admin, supabaseUrl, storagePath);
  if (cached) return cached;

  const bytes = await generateImageBytes(topicCoverPrompt(name, kind, hint));
  if (!bytes) return null;
  return uploadImage(admin, supabaseUrl, storagePath, bytes);
}
