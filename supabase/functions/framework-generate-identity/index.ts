/**
 * Synthesizes a short "who you are" identity summary from framework data (beliefs,
 * versions, influences, artifacts) via Gemini, then stores JSON on profiles.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_BELIEFS = 60;
const TOP_INFLUENCES = 15;
const MAX_ARTIFACTS = 25;

type IdentitySummary = {
  summary: string;
  markers: string[];
  voice: string;
  tags: string[];
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

function parseIdentitySummary(raw: unknown): IdentitySummary | null {
  if (!isRecord(raw)) return null;
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const voice = typeof raw.voice === "string" ? raw.voice.trim() : "";
  if (!summary || !voice) return null;
  if (!Array.isArray(raw.markers) || !Array.isArray(raw.tags)) return null;
  const markers = raw.markers
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = raw.tags
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  if (markers.length === 0 || tags.length === 0) return null;
  return { summary, markers, voice, tags };
}

function extractGeminiText(data: unknown): string {
  if (!isRecord(data)) return "";
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0];
  if (!isRecord(first)) return "";
  const content = first.content;
  if (!isRecord(content)) return "";
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (isRecord(p) && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function snapshotLines(snapshot: unknown): Record<string, string> {
  if (!isRecord(snapshot)) return {};
  const keys = [
    "statement",
    "topic",
    "layer",
    "answer",
    "notes",
    "confidence",
  ] as const;
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = snapshot[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 2000);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = String(v);
  }
  return out;
}

function artifactMetaLine(meta: unknown): string | undefined {
  if (!isRecord(meta)) return undefined;
  const channel =
    typeof meta.channel === "string"
      ? meta.channel.trim()
      : typeof meta.channel_title === "string"
        ? meta.channel_title.trim()
        : typeof meta.channelTitle === "string"
          ? meta.channelTitle.trim()
          : "";
  const author =
    typeof meta.author === "string"
      ? meta.author.trim()
      : typeof meta.author_name === "string"
        ? meta.author_name.trim()
        : "";
  const bits = [channel, author].filter(Boolean);
  return bits.length ? bits.join(" · ") : undefined;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const uid = userData.user.id;

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", uid)
      .maybeSingle();
    if (profErr) {
      return jsonResponse({ error: profErr.message }, 502);
    }

    const displayName =
      typeof profile?.display_name === "string" ? profile.display_name.trim() : "";

    const { data: beliefRows, error: bErr } = await supabase
      .from("belief_nodes")
      .select("id,layer,topic,statement")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(MAX_BELIEFS);
    if (bErr) {
      return jsonResponse({ error: bErr.message }, 502);
    }
    const beliefs = (beliefRows ?? []) as Array<{
      id: string;
      layer: string;
      topic: string;
      statement: string;
    }>;
    const beliefIds = beliefs.map((b) => b.id);

    const versionByBelief = new Map<string, Record<string, string>>();
    if (beliefIds.length > 0) {
      const { data: versions, error: vErr } = await supabase
        .from("belief_versions")
        .select("belief_id,created_at,snapshot")
        .eq("user_id", uid)
        .in("belief_id", beliefIds)
        .order("created_at", { ascending: false });
      if (vErr) {
        return jsonResponse({ error: vErr.message }, 502);
      }
      for (const row of versions ?? []) {
        const bid = (row as { belief_id: string }).belief_id;
        if (!versionByBelief.has(bid)) {
          versionByBelief.set(
            bid,
            snapshotLines((row as { snapshot: unknown }).snapshot),
          );
        }
      }
    }

    type SourceRow = {
      source_type: string;
      label: string;
      avatar_url: string | null;
      metadata: unknown;
    };
    const { data: sourceRows, error: sErr } = await supabase
      .from("belief_sources")
      .select("source_type,label,avatar_url,metadata")
      .eq("user_id", uid);
    if (sErr) {
      return jsonResponse({ error: sErr.message }, 502);
    }

    const groupMap = new Map<
      string,
      {
        source_type: string;
        label: string;
        count: number;
        avatar_url: string | null;
        metadata: unknown;
      }
    >();
    for (const r of (sourceRows ?? []) as SourceRow[]) {
      const key = `${r.source_type.toLowerCase()}::${r.label.trim().toLowerCase()}`;
      const prev = groupMap.get(key);
      if (!prev) {
        groupMap.set(key, {
          source_type: r.source_type,
          label: r.label.trim(),
          count: 1,
          avatar_url: r.avatar_url,
          metadata: r.metadata,
        });
      } else {
        prev.count += 1;
        if (!prev.avatar_url && r.avatar_url) prev.avatar_url = r.avatar_url;
        if (
          prev.metadata == null &&
          r.metadata != null &&
          isRecord(r.metadata) &&
          Object.keys(r.metadata).length > 0
        ) {
          prev.metadata = r.metadata;
        }
        groupMap.set(key, prev);
      }
    }
    const influences = [...groupMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_INFLUENCES)
      .map((g) => ({
        source_type: g.source_type,
        label: g.label,
        linked_beliefs: g.count,
        avatar_url: g.avatar_url,
        metadata: g.metadata,
      }));

    const { data: artifactRows, error: aErr } = await supabase
      .from("artifacts")
      .select("title,kind,metadata")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(MAX_ARTIFACTS);
    if (aErr) {
      return jsonResponse({ error: aErr.message }, 502);
    }
    const artifacts = ((artifactRows ?? []) as Array<{
      title: string | null;
      kind: string;
      metadata: unknown;
    }>).map((a) => ({
      title: typeof a.title === "string" ? a.title : null,
      kind: a.kind,
      channel_or_author: artifactMetaLine(a.metadata),
    }));

    const beliefsPayload = beliefs.map((b) => ({
      id: b.id,
      layer: b.layer,
      topic: b.topic,
      statement: b.statement,
      latest_version_snapshot: versionByBelief.get(b.id) ?? null,
    }));

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) {
      return jsonResponse({ error: "Identity synthesis is not configured." }, 502);
    }

    const contextJson = JSON.stringify(
      {
        display_name: displayName || null,
        beliefs: beliefsPayload,
        influences,
        recent_artifacts: artifacts,
      },
      null,
      0,
    );

    const prompt = `You are writing for one person about their religious/theological framework (beliefs, influences, recent study artifacts).

Here is structured data about them (JSON). Use ONLY this material. Do not invent biographical facts, institutions, or relationships not implied by the data. Stay charitable and concise.

${contextJson}

Return a single JSON object (no markdown fences) with exactly these keys:
- "summary": string, 2–3 short paragraphs, second person ("You…") by default, warm and precise.
- "markers": array of 4–7 short strings, sentence fragments naming recurring themes or postures (not full sentences).
- "voice": one sentence, first person ("I…"), as if they are describing themselves in their own voice — still grounded in the data.
- "tags": array of 3–6 short identity tags (single words or 2-word phrases, Title Case optional).

Do not include keys other than summary, markers, voice, tags.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      return jsonResponse(
        {
          error: `Gemini request failed (${geminiRes.status}): ${errText.slice(0, 400)}`,
        },
        502,
      );
    }

    const geminiJson: unknown = await geminiRes.json().catch(() => null);
    const rawText = extractGeminiText(geminiJson);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(rawText));
    } catch {
      return jsonResponse({ error: "Gemini returned invalid JSON." }, 502);
    }

    const identity = parseIdentitySummary(parsed);
    if (!identity) {
      return jsonResponse({ error: "Gemini returned JSON in an unexpected shape." }, 502);
    }

    const { data: updated, error: upErr } = await supabase
      .from("profiles")
      .update({
        identity_summary: identity,
        identity_generated_at: new Date().toISOString(),
      })
      .eq("user_id", uid)
      .select("identity_summary,identity_generated_at")
      .maybeSingle();

    if (upErr || !updated) {
      return jsonResponse(
        { error: upErr?.message ?? "Failed to save identity summary." },
        502,
      );
    }

    return jsonResponse({
      identity_summary: updated.identity_summary,
      identity_generated_at: updated.identity_generated_at,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 502);
  }
});
