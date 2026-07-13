import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { generateOpenAiImageBytes } from "../_shared/openAiImageGeneration.ts";
import { jsonCorsHeaders, requireUser } from "../_shared/requireUser.ts";

const BUCKET = "children-book-illustrations";
const MAX_PROMPT_CHARS = 12_000;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonCorsHeaders, "Content-Type": "application/json" },
  });
}

function publicImageUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function pageStoragePath(bookSlug: string, pageNumber: number): string {
  const safeSlug = bookSlug.replace(/[^a-z0-9-]/gi, "").slice(0, 80);
  const page = String(Math.max(1, Math.floor(pageNumber))).padStart(2, "0");
  return `books/${safeSlug}/${page}.png`;
}

function coverStoragePath(bookSlug: string): string {
  const safeSlug = bookSlug.replace(/[^a-z0-9-]/gi, "").slice(0, 80);
  return `books/${safeSlug}/cover.png`;
}

async function readCachedImage(
  admin: ReturnType<typeof createClient>,
  supabaseUrl: string,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  if ((data.size ?? 0) < 512) return null;
  return publicImageUrl(supabaseUrl, storagePath);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonCorsHeaders });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return jsonResponse({ error: "Server misconfigured" }, 502);
  }

  let body: {
    book_slug?: string;
    page_number?: number;
    image_kind?: string;
    prompt?: string;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const bookSlug = typeof body.book_slug === "string" ? body.book_slug.trim() : "";
  const imageKind = body.image_kind === "cover" ? "cover" : "page";
  const pageNumber = typeof body.page_number === "number" ? body.page_number : Number(body.page_number);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const force = body.force === true;

  if (!bookSlug) {
    return jsonResponse({ error: "book_slug is required" }, 400);
  }
  if (imageKind === "page" && (!Number.isFinite(pageNumber) || pageNumber < 1)) {
    return jsonResponse({ error: "book_slug and page_number are required" }, 400);
  }
  if (!prompt) return jsonResponse({ error: "prompt is required" }, 400);
  if (prompt.length > MAX_PROMPT_CHARS) {
    return jsonResponse({ error: `prompt too long (max ${MAX_PROMPT_CHARS} chars)` }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const storagePath =
    imageKind === "cover" ? coverStoragePath(bookSlug) : pageStoragePath(bookSlug, pageNumber);

  if (!force) {
    const cached = await readCachedImage(admin, supabaseUrl, storagePath);
    if (cached) return jsonResponse({ image_url: cached, cached: true });
  }

  const { bytes, err } = await generateOpenAiImageBytes(prompt);
  if (!bytes) return jsonResponse({ error: err ?? "Image generation failed" }, 502);

  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "31536000",
  });
  if (uploadErr) {
    return jsonResponse({ error: `Upload failed: ${uploadErr.message}` }, 502);
  }

  return jsonResponse({
    image_url: publicImageUrl(supabaseUrl, storagePath),
    cached: false,
  });
});
