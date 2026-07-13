const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export function getOpenAiImageModel(): string {
  return Deno.env.get("OPENAI_IMAGE_MODEL")?.trim() || "gpt-image-2";
}

export function getOpenAiImageQuality(): "low" | "medium" | "high" {
  const raw = Deno.env.get("OPENAI_IMAGE_QUALITY")?.trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "high";
}

export async function generateOpenAiImageBytes(prompt: string): Promise<{ bytes: Uint8Array | null; err?: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) {
    return { bytes: null, err: "OPENAI_API_KEY is not configured" };
  }

  const model = getOpenAiImageModel();
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1536",
      quality: getOpenAiImageQuality(),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) {
      return { bytes: null, err: "OpenAI request failed (401). Check OPENAI_API_KEY in Supabase secrets." };
    }
    return { bytes: null, err: `OpenAI image generation failed (${res.status}): ${detail.slice(0, 400)}` };
  }

  const data = (await res.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string }>;
  } | null;

  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return { bytes: null, err: "OpenAI returned no image data" };

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 512) return { bytes: null, err: "OpenAI returned an empty image" };

  return { bytes };
}
