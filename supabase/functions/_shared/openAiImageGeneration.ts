import {
  referenceFileName,
  type ResolvedReferenceBytes,
} from "./childrenBookGeneration.ts";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

export function getOpenAiImageModel(): string {
  return Deno.env.get("OPENAI_IMAGE_MODEL")?.trim() || "gpt-image-2";
}

export function getOpenAiImageQuality(): "low" | "medium" | "high" {
  const raw = Deno.env.get("OPENAI_IMAGE_QUALITY")?.trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "high";
}

export type ImageGenResult = { bytes: Uint8Array | null; err?: string };

function decodeB64Image(b64: string | undefined): ImageGenResult {
  if (!b64) return { bytes: null, err: "OpenAI returned no image data" };
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 512) return { bytes: null, err: "OpenAI returned an empty image" };
  return { bytes };
}

/** Text-only generation — explicit fallback for scenes with no recurring cast. */
export async function generateOpenAiImageBytes(
  prompt: string,
  size = "1024x1536",
): Promise<ImageGenResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) return { bytes: null, err: "OPENAI_API_KEY is not configured" };

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: getOpenAiImageModel(), prompt, size, quality: getOpenAiImageQuality() }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) {
      return { bytes: null, err: "OpenAI request failed (401). Check OPENAI_API_KEY in Supabase secrets." };
    }
    return { bytes: null, err: `OpenAI image generation failed (${res.status}): ${detail.slice(0, 400)}` };
  }

  const data = (await res.json().catch(() => null)) as { data?: Array<{ b64_json?: string }> } | null;
  return decodeB64Image(data?.data?.[0]?.b64_json);
}

/**
 * Reference-image generation with gpt-image-2 via the image-edits endpoint.
 * The supplied approved model sheets establish identity + studio style; the
 * prompt tells the model to create a NEW scene, not reproduce the sheets.
 *
 * gpt-image-2 always processes image inputs at high fidelity, so input_fidelity
 * is intentionally NOT set. Images are sent studio-anchor-first, then heroine,
 * then supporting characters (the caller controls order).
 */
export async function generateOpenAiImageFromReferences(
  prompt: string,
  references: ResolvedReferenceBytes[],
  size = "1024x1536",
): Promise<ImageGenResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) return { bytes: null, err: "OPENAI_API_KEY is not configured" };
  if (references.length === 0) {
    return { bytes: null, err: "No reference images supplied for reference-image generation" };
  }

  const form = new FormData();
  form.append("model", getOpenAiImageModel());
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", getOpenAiImageQuality());
  for (const ref of references) {
    const blob = new Blob([ref.bytes], { type: ref.contentType });
    form.append("image[]", blob, referenceFileName(ref.path));
  }

  const res = await fetch(OPENAI_IMAGE_EDITS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) {
      return { bytes: null, err: "OpenAI request failed (401). Check OPENAI_API_KEY in Supabase secrets." };
    }
    return { bytes: null, err: `OpenAI reference-image generation failed (${res.status}): ${detail.slice(0, 400)}` };
  }

  const data = (await res.json().catch(() => null)) as { data?: Array<{ b64_json?: string }> } | null;
  return decodeB64Image(data?.data?.[0]?.b64_json);
}
