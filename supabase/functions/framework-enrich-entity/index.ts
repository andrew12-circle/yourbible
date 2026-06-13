/**
 * Enriches knowledge_entities from Wikipedia → DuckDuckGo → Gemini → AI image.
 * Person rows get profile photos; book/theme rows get cover art when missing.
 */
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  biblicalFigureBio,
  getOrCreateBiblicalPortraitUrl,
  isBiblicalFigure,
} from "../_shared/biblicalFigurePortrait.ts";
import {
  getOrCreatePublicFigurePortraitUrl,
  getOrCreateTopicCoverUrl,
  tryOpenLibraryCover,
} from "../_shared/entityPortrait.ts";
import {
  enrichPublicFigure,
  hasUsefulEnrichContent,
  sleep,
  trimStr,
  type EnrichSource,
  type PublicFigureEnrichResult,
} from "../_shared/publicFigureEnrich.ts";

const BETWEEN_ENTITY_MS = 550;

type EntityMeta = {
  bio?: string;
  source_url?: string;
  enrichment_source?: EnrichSource;
  enriched_at?: string;
  role?: string;
  summary?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseEntityMeta(raw: unknown): EntityMeta {
  if (!isRecord(raw)) return {};
  const bio = trimStr(raw.bio);
  const source_url = trimStr(raw.source_url);
  const enriched_at = trimStr(raw.enriched_at);
  const role = trimStr(raw.role);
  const summary = trimStr(raw.summary);
  const enrichment_source =
    raw.enrichment_source === "wikipedia" ||
    raw.enrichment_source === "duckduckgo" ||
    raw.enrichment_source === "llm" ||
    raw.enrichment_source === "ai_portrait"
      ? raw.enrichment_source
      : undefined;
  return {
    ...(bio ? { bio } : {}),
    ...(source_url ? { source_url } : {}),
    ...(enrichment_source ? { enrichment_source } : {}),
    ...(enriched_at ? { enriched_at } : {}),
    ...(role ? { role } : {}),
    ...(summary ? { summary } : {}),
  };
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function normalizeNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

const TOPIC_ENTITY_KINDS = new Set([
  "book",
  "scripture",
  "dream_vision",
  "fear",
  "question",
  "project",
  "business",
  "system",
  "technology",
]);

async function enrichPersonAvatar(
  admin: SupabaseClient | null,
  supabaseUrl: string,
  title: string,
  hint: string | undefined,
  payload: PublicFigureEnrichResult,
): Promise<PublicFigureEnrichResult> {
  if (trimStr(payload.avatar_url) || !admin) return payload;

  if (isBiblicalFigure(title)) {
    const portraitUrl = await getOrCreateBiblicalPortraitUrl(admin, supabaseUrl, title);
    if (portraitUrl) {
      return {
        ...payload,
        avatar_url: portraitUrl,
        source: "ai_portrait",
        bio: payload.bio ?? biblicalFigureBio(title),
      };
    }
  }

  const portraitUrl = await getOrCreatePublicFigurePortraitUrl(admin, supabaseUrl, title, hint);
  if (!portraitUrl) return payload;
  return { ...payload, avatar_url: portraitUrl, source: "ai_portrait" };
}

async function enrichTopicCover(
  admin: SupabaseClient | null,
  supabaseUrl: string,
  title: string,
  kind: string,
  hint: string | undefined,
  payload: PublicFigureEnrichResult,
): Promise<PublicFigureEnrichResult> {
  if (trimStr(payload.avatar_url)) return payload;

  if (kind === "book") {
    const cover = await tryOpenLibraryCover(title).catch(() => null);
    if (cover) return { ...payload, avatar_url: cover, source: payload.source ?? "wikipedia" };
  }

  if (!admin) return payload;
  const coverUrl = await getOrCreateTopicCoverUrl(admin, supabaseUrl, title, kind, hint);
  if (!coverUrl) return payload;
  return { ...payload, avatar_url: coverUrl, source: "ai_portrait" };
}

async function enrichByDisplayName(
  admin: SupabaseClient | null,
  supabaseUrl: string,
  name: string,
  artifactHint?: string,
): Promise<{ name: string; ok: boolean; avatar_url?: string; source?: EnrichSource; detail?: string }> {
  const title = name.trim();
  if (!title) return { name, ok: false, detail: "Name is required." };

  const hint = artifactHint?.trim() || undefined;
  let payload: PublicFigureEnrichResult = {};
  if (isBiblicalFigure(title) && admin) {
    const portraitUrl = await getOrCreateBiblicalPortraitUrl(admin, supabaseUrl, title);
    if (portraitUrl) {
      payload = { avatar_url: portraitUrl, bio: biblicalFigureBio(title), source: "ai_portrait" };
    }
  }
  if (!hasUsefulEnrichContent(payload)) {
    const enriched = await enrichPublicFigure(title, "person", hint);
    payload = enriched.result;
    payload = await enrichPersonAvatar(admin, supabaseUrl, title, hint, payload);
  }

  const avatar = trimStr(payload.avatar_url);
  if (!avatar) {
    return { name: title, ok: true, detail: "No profile image found." };
  }
  return { name: title, ok: true, avatar_url: avatar, source: payload.source };
}

async function enrichOneEntity(
  supabase: SupabaseClient,
  admin: SupabaseClient | null,
  supabaseUrl: string,
  userId: string,
  entityId: string,
  artifactHint?: string,
): Promise<{
  entity_id: string;
  ok: boolean;
  saved?: boolean;
  error?: string;
  detail?: string;
  avatar_url?: string;
  bio?: string;
  source_url?: string;
  source?: EnrichSource;
}> {
  const id = entityId.trim();
  if (!id) {
    return { entity_id: "", ok: false, error: "entity_id is required" };
  }

  const { data: row, error: qErr } = await supabase
    .from("knowledge_entities")
    .select("id,kind,title,subtitle,avatar_url,metadata")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (qErr) {
    return { entity_id: id, ok: false, error: qErr.message };
  }
  if (!row) {
    return { entity_id: id, ok: false, error: "Entity not found or not accessible." };
  }

  const entity = row as {
    id: string;
    kind: string;
    title: string;
    subtitle: string | null;
    avatar_url: string | null;
    metadata: unknown;
  };

  const existingAvatar = trimStr(entity.avatar_url);
  if (existingAvatar) {
    return {
      entity_id: id,
      ok: true,
      saved: false,
      detail: "Entity already has an avatar.",
      avatar_url: existingAvatar,
    };
  }

  const meta = parseEntityMeta(entity.metadata);
  const scope = entity.subtitle?.trim() || meta.role || entity.kind;
  const hint = [artifactHint?.trim(), meta.summary?.trim()].filter(Boolean).join(" · ") || undefined;

  let payload: PublicFigureEnrichResult = {};
  let llmFault: string | undefined;

  if (entity.kind === "person") {
    if (isBiblicalFigure(entity.title)) {
      if (admin) {
        const portraitUrl = await getOrCreateBiblicalPortraitUrl(admin, supabaseUrl, entity.title);
        if (portraitUrl) {
          payload = {
            avatar_url: portraitUrl,
            bio: biblicalFigureBio(entity.title),
            source: "ai_portrait",
          };
        }
      }
      if (!hasUsefulEnrichContent(payload)) {
        const fallback = await enrichPublicFigure(entity.title, scope, hint);
        payload = fallback.result;
        llmFault = fallback.llmFault;
      }
    } else {
      const enriched = await enrichPublicFigure(entity.title, scope, hint);
      payload = enriched.result;
      llmFault = enriched.llmFault;
    }
    payload = await enrichPersonAvatar(admin, supabaseUrl, entity.title, hint, payload);
  } else if (TOPIC_ENTITY_KINDS.has(entity.kind)) {
    const enriched = await enrichPublicFigure(entity.title, entity.kind, hint);
    payload = enriched.result;
    llmFault = enriched.llmFault;
    payload = await enrichTopicCover(admin, supabaseUrl, entity.title, entity.kind, hint, payload);
  } else {
    return {
      entity_id: id,
      ok: false,
      error: `Entity kind "${entity.kind}" is not supported for image enrichment.`,
    };
  }

  if (!hasUsefulEnrichContent(payload)) {
    return {
      entity_id: id,
      ok: true,
      saved: false,
      detail: llmFault ?? "No public profile found from Wikipedia, DuckDuckGo, or Gemini.",
    };
  }

  const newAvatar =
    trimStr(payload.avatar_url) || trimStr(entity.avatar_url) || undefined;
  const newBio = trimStr(payload.bio) || meta.bio;
  const newSourceUrl = trimStr(payload.source_url) || meta.source_url;
  const enrichment_source = payload.source ?? meta.enrichment_source;
  const nextMeta: Record<string, unknown> = {
    ...(isRecord(entity.metadata) ? entity.metadata : {}),
    ...(newBio ? { bio: newBio } : {}),
    ...(newSourceUrl ? { source_url: newSourceUrl } : {}),
    ...(enrichment_source ? { enrichment_source } : {}),
    enriched_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("knowledge_entities")
    .update({
      avatar_url: newAvatar ?? null,
      metadata: nextMeta,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (upErr) {
    return { entity_id: id, ok: false, error: upErr.message };
  }

  return {
    entity_id: id,
    ok: true,
    saved: true,
    avatar_url: newAvatar,
    bio: trimStr(payload.bio),
    source_url: trimStr(payload.source_url),
    source: payload.source,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ ok: false, error: "Supabase environment is not configured." }, 500);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    const uid = userData.user.id;

    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SERVICE_ROLE ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const artifactHint = typeof body.artifact_hint === "string" ? body.artifact_hint : undefined;

    const entitiesRaw = body.entities;
    if (Array.isArray(entitiesRaw) && entitiesRaw.length > 0) {
      const results: Awaited<ReturnType<typeof enrichOneEntity>>[] = [];
      for (let i = 0; i < entitiesRaw.length; i += 1) {
        const g = entitiesRaw[i];
        const entityId = isRecord(g) && typeof g.entity_id === "string" ? g.entity_id : "";
        if (i > 0) await sleep(BETWEEN_ENTITY_MS);
        results.push(await enrichOneEntity(supabase, admin, SUPABASE_URL, uid, entityId, artifactHint));
      }
      return jsonResponse({ ok: true, results });
    }

    let ids = normalizeIds(body.entity_ids);
    if (ids.length === 0) ids = normalizeIds(body.ids);
    if (ids.length === 0 && typeof body.entity_id === "string" && body.entity_id.trim()) {
      ids = [body.entity_id.trim()];
    }

    const castNames = normalizeNames(body.cast_names);
    if (castNames.length > 0) {
      const nameResults: Awaited<ReturnType<typeof enrichByDisplayName>>[] = [];
      for (let i = 0; i < castNames.length; i += 1) {
        if (i > 0) await sleep(BETWEEN_ENTITY_MS);
        nameResults.push(await enrichByDisplayName(admin, SUPABASE_URL, castNames[i], artifactHint));
      }
      return jsonResponse({ ok: true, name_results: nameResults });
    }

    if (ids.length > 0) {
      const results: Awaited<ReturnType<typeof enrichOneEntity>>[] = [];
      for (let i = 0; i < ids.length; i += 1) {
        if (i > 0) await sleep(BETWEEN_ENTITY_MS);
        results.push(await enrichOneEntity(supabase, admin, SUPABASE_URL, uid, ids[i], artifactHint));
      }
      if (results.length === 1) {
        const one = results[0];
        if (!one.ok) {
          return jsonResponse({ ok: false, error: one.error ?? "Enrichment failed." }, 200);
        }
        return jsonResponse({
          ok: true,
          saved: one.saved,
          detail: one.saved ? undefined : one.detail,
          entity_id: one.entity_id,
          avatar_url: one.avatar_url,
          bio: one.bio,
          source_url: one.source_url,
          source: one.source,
        });
      }
      return jsonResponse({ ok: true, results });
    }

    return jsonResponse({ ok: false, error: "Send entity_id, entity_ids, ids, or entities." }, 400);
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
