import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  generationFingerprint,
  resolveReferenceBytes,
  versionedStoragePath,
  type ReferenceImageInput,
  type ResolvedReferenceBytes,
  type VersionMetadata,
} from "../_shared/childrenBookGeneration.ts";
import {
  generateOpenAiImageBytes,
  generateOpenAiImageFromReferences,
  getOpenAiImageModel,
  getOpenAiImageQuality,
  type ImageGenResult,
} from "../_shared/openAiImageGeneration.ts";
import { qcEnabled, reviewGeneratedImage, type QcResult } from "../_shared/openAiImageQc.ts";
import { jsonCorsHeaders, requireUser } from "../_shared/requireUser.ts";

const BUCKET = "children-book-illustrations";
const MAX_PROMPT_CHARS = 30_000;
const IMAGE_SIZE = "1024x1536";

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
    reference_images?: ReferenceImageInput[];
    present_character_ids?: string[];
    version_metadata?: VersionMetadata;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const bookSlug = typeof body.book_slug === "string" ? body.book_slug.trim() : "";
  const imageKind =
    body.image_kind === "cover" ? "cover" : body.image_kind === "closing" ? "closing" : "page";
  const pageNumber =
    typeof body.page_number === "number" ? body.page_number : Number(body.page_number);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const force = body.force === true;
  const references = Array.isArray(body.reference_images) ? body.reference_images : [];
  const present = Array.isArray(body.present_character_ids) ? body.present_character_ids : [];
  const versionMetadata: VersionMetadata = body.version_metadata ?? {};

  if (!bookSlug) return jsonResponse({ error: "book_slug is required" }, 400);
  if (imageKind === "page" && (!Number.isFinite(pageNumber) || pageNumber < 1)) {
    return jsonResponse({ error: "book_slug and page_number are required" }, 400);
  }
  if (!prompt) return jsonResponse({ error: "prompt is required" }, 400);
  if (prompt.length > MAX_PROMPT_CHARS) {
    return jsonResponse({ error: `prompt too long (max ${MAX_PROMPT_CHARS} chars)` }, 400);
  }

  // Section 15 — pre-generation validation (mirror of the client checks).
  const hasStudioAnchor = references.some((r) => r?.role === "studio-style");
  if (present.length > 0) {
    if (references.length === 0) {
      return jsonResponse(
        { error: "Reference images are required for scenes with recurring characters." },
        400,
      );
    }
    if (!hasStudioAnchor) {
      return jsonResponse({ error: "A studio-style anchor reference is required." }, 400);
    }
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const model = getOpenAiImageModel();
  const quality = getOpenAiImageQuality();
  const styleVersion = versionMetadata.studioStyleVersion || "v0";

  const promptHash = generationFingerprint({
    bookSlug,
    imageKind,
    pageNumber: imageKind === "page" ? pageNumber : undefined,
    versionMetadata,
    prompt,
    model,
    quality,
    size: IMAGE_SIZE,
  });

  const storagePath = versionedStoragePath(
    bookSlug,
    imageKind,
    imageKind === "page" ? pageNumber : undefined,
    styleVersion,
    promptHash,
  );

  if (!force) {
    const cached = await readCachedImage(admin, supabaseUrl, storagePath);
    if (cached) {
      return jsonResponse({
        image_url: cached,
        cached: true,
        storage_path: storagePath,
        prompt_hash: promptHash,
        reference_versions: versionMetadata.characterReferenceVersions ?? {},
      });
    }
  }

  // Resolve approved reference bytes server-side (allow-listed paths only).
  let resolvedRefs: ResolvedReferenceBytes[] = [];
  if (references.length > 0) {
    const assetBase = Deno.env.get("CHILDREN_BOOK_ASSET_BASE_URL") ?? undefined;
    const resolved = await resolveReferenceBytes(admin, references, assetBase);
    if (resolved.err) return jsonResponse({ error: resolved.err }, 400);
    resolvedRefs = resolved.images;
  }

  const runGeneration = (extraInstruction?: string): Promise<ImageGenResult> => {
    const finalPrompt = extraInstruction ? `${prompt}\n\nCORRECTION: ${extraInstruction}` : prompt;
    return resolvedRefs.length > 0
      ? generateOpenAiImageFromReferences(finalPrompt, resolvedRefs, IMAGE_SIZE)
      : generateOpenAiImageBytes(finalPrompt, IMAGE_SIZE);
  };

  let generated = await runGeneration();
  if (!generated.bytes) {
    return jsonResponse({ error: generated.err ?? "Image generation failed" }, 502);
  }

  // Section 16 — optional QC with at most one automatic corrected retry.
  let qc: QcResult | null = null;
  if (qcEnabled() && resolvedRefs.length > 0) {
    qc = await reviewGeneratedImage(generated.bytes, resolvedRefs, present);
    if (qc && !qc.approved && qc.retryInstruction) {
      const retry = await runGeneration(qc.retryInstruction);
      if (retry.bytes) {
        const qcRetry = await reviewGeneratedImage(retry.bytes, resolvedRefs, present);
        if (qcRetry?.approved || !qc.approved) {
          generated = retry;
          qc = qcRetry ?? qc;
        }
      }
    }
  }

  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storagePath, generated.bytes, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "31536000",
  });
  if (uploadErr) {
    return jsonResponse({ error: `Upload failed: ${uploadErr.message}` }, 502);
  }

  const imageUrl = publicImageUrl(supabaseUrl, storagePath);

  // Persist metadata beside the image (Section 14).
  const metadata = {
    bookSlug,
    pageNumber: imageKind === "page" ? pageNumber : null,
    imageKind,
    studioStyleVersion: styleVersion,
    worldBibleVersion: versionMetadata.worldBibleVersion ?? null,
    promptVersion: versionMetadata.promptVersion ?? null,
    characterReferenceVersions: versionMetadata.characterReferenceVersions ?? {},
    promptHash,
    model,
    quality,
    size: IMAGE_SIZE,
    referencePaths: resolvedRefs.map((r) => r.path),
    referenceCount: resolvedRefs.length,
    textOnlyFallback: resolvedRefs.length === 0,
    qc: qc ?? null,
    generatedAt: new Date().toISOString(),
    imageUrl,
  };
  await admin.storage
    .from(BUCKET)
    .upload(storagePath.replace(/\.png$/, ".json"), JSON.stringify(metadata, null, 2), {
      upsert: true,
      contentType: "application/json",
      cacheControl: "300",
    })
    .catch(() => undefined);

  return jsonResponse({
    image_url: imageUrl,
    cached: false,
    storage_path: storagePath,
    prompt_hash: promptHash,
    reference_versions: versionMetadata.characterReferenceVersions ?? {},
    reference_count: resolvedRefs.length,
    text_only_fallback: resolvedRefs.length === 0,
    qc: qc ?? undefined,
  });
});
