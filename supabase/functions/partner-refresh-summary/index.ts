/**
 * Builds a privacy-safe partner digest from the caller's own framework data (JWT),
 * then upserts partner_summaries for each active connection. Never reads the partner's rows.
 * Email delivery for invites is out of scope — clients copy a link instead.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const WINDOW_DAYS = 60;
const MAX_JOURNALS = 40;
const MAX_BELIEFS = 28;
const MAX_TEACHINGS = 20;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence ? fence[1].trim() : t;
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

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Remove location / weather / geo from text before sending to the model. */
function redactSensitiveText(raw: string): string {
  let s = raw.replace(/\b(lat|lng|latitude|longitude)\b\s*[:=]\s*[-0-9.]+/gi, "[location omitted]");
  s = s.replace(/\b\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+\b/g, "[coordinates omitted]");
  return s;
}

function identitySummarySnippet(raw: unknown): string {
  if (!isRecord(raw)) return "";
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const voice = typeof raw.voice === "string" ? raw.voice.trim() : "";
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((x): x is string => typeof x === "string").slice(0, 8).join(", ")
    : "";
  const bits = [summary && `Summary: ${truncate(summary, 900)}`, voice && `Voice: ${truncate(voice, 220)}`, tags && `Tags: ${tags}`];
  return truncate(bits.filter(Boolean).join("\n"), 1800);
}

type ShareRow = {
  share_summary: boolean;
  share_prayer_needs: boolean;
  share_recent_themes: boolean;
  share_testimony: boolean;
  share_mood_pulse: boolean;
};

type LlmOut = {
  summary: string;
  recent_themes: string[];
  prayer_points: string[];
  season_label: string;
  mood_pulse: unknown;
};

function parseLlmJson(text: string): LlmOut | null {
  const raw = stripJsonFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const season_label = typeof parsed.season_label === "string" ? parsed.season_label.trim() : "";
  const recent_themes = Array.isArray(parsed.recent_themes)
    ? parsed.recent_themes.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean).slice(0, 12)
    : [];
  const prayer_points = Array.isArray(parsed.prayer_points)
    ? parsed.prayer_points.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean).slice(0, 12)
    : [];
  const mood_pulse = parsed.mood_pulse ?? null;
  if (!summary) return null;
  return { summary, recent_themes, prayer_points, season_label, mood_pulse };
}

function applyShareGates(row: ShareRow, parsed: LlmOut): LlmOut {
  return {
    summary: row.share_summary ? parsed.summary : "",
    recent_themes: row.share_recent_themes ? parsed.recent_themes : [],
    prayer_points: row.share_prayer_needs ? parsed.prayer_points : [],
    season_label: row.share_summary ? parsed.season_label : "",
    mood_pulse: row.share_mood_pulse ? parsed.mood_pulse : null,
  };
}

function shareGateKey(g: ShareRow): string {
  return [
    g.share_summary ? "1" : "0",
    g.share_prayer_needs ? "1" : "0",
    g.share_recent_themes ? "1" : "0",
    g.share_testimony ? "1" : "0",
    g.share_mood_pulse ? "1" : "0",
  ].join("");
}

const DEFAULT_SHARE: ShareRow = {
  share_summary: true,
  share_prayer_needs: true,
  share_recent_themes: true,
  share_testimony: true,
  share_mood_pulse: false,
};

async function runGeminiModel(
  geminiKey: string,
  payload: unknown,
  gate: ShareRow,
): Promise<LlmOut | null> {
  const testimonyLine = gate.share_testimony
    ? "You may mention their walk with God in broad, gentle strokes."
    : "Do NOT include personal testimony arcs, dramatic life-story beats, or identifiable spiritual milestones — keep God's work abstract and non-chronological.";

  const prompt = `You are helping a married or close spiritual friendship walk together with strong privacy.

Input is aggregated signals from ONE person's app (beliefs, non-private journal themes, accepted teachings, identity excerpt). 
entry_kind "vent" and entries the user marked not-for-mirror are already excluded — do not infer what was removed.

${testimonyLine}

Write ONLY valid JSON (no markdown) with this exact shape:
{"summary":"string (2-5 sentences, third person, pastoral, non-clinical)","recent_themes":["short phrase", "... up to 8"],"prayer_points":["...", "up to 6"],"season_label":"one short label like Renewal, Wilderness, Harvest, Waiting, or similar","mood_pulse":null or {"axes":{"hope":0.2,"peace":-0.1},"note":"optional short gloss"}}

Hard rules:
- Never quote or closely paraphrase journal sentences; describe patterns only.
- Do not name other people, workplaces, cities, churches, or identifiable third parties.
- Do not mention coordinates, street addresses, weather strings, or location names even if they appeared in removed metadata.
- If spiritual themes are thin, stay humble and general rather than inventing specifics.

Context JSON:
${JSON.stringify(payload)}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    throw new Error(`Gemini request failed (${geminiRes.status}): ${errText.slice(0, 500)}`);
  }

  const geminiJson: unknown = await geminiRes.json().catch(() => null);
  const rawText = extractGeminiText(geminiJson);
  return parseLlmJson(rawText);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const uid = userData.user.id;

    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY is not configured." }, 502);
    }

    const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();

    const [
      connRes,
      beliefsRes,
      journalsRes,
      teachingsRes,
      profileRes,
    ] = await Promise.all([
      supabase
        .from("partner_connections")
        .select("id,user_a,user_b,is_active")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .eq("is_active", true),
      supabase
        .from("belief_nodes")
        .select("topic,statement,layer")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(MAX_BELIEFS),
      supabase
        .from("journal_entries")
        .select("id,title,body,entry_at_ts,entry_kind,mood")
        .eq("user_id", uid)
        .gte("entry_at_ts", since)
        .eq("analyze_for_mirror", true)
        .or("entry_kind.is.null,entry_kind.neq.vent")
        .order("entry_at_ts", { ascending: false })
        .limit(MAX_JOURNALS),
      supabase
        .from("teachings")
        .select("title,summary,category,scriptures")
        .eq("user_id", uid)
        .eq("status", "accepted")
        .order("updated_at", { ascending: false })
        .limit(MAX_TEACHINGS),
      supabase.from("profiles").select("identity_summary").eq("user_id", uid).maybeSingle(),
    ]);

    if (connRes.error) return jsonResponse({ error: connRes.error.message }, 502);
    if (beliefsRes.error) return jsonResponse({ error: beliefsRes.error.message }, 502);
    if (journalsRes.error) return jsonResponse({ error: journalsRes.error.message }, 502);
    if (teachingsRes.error) return jsonResponse({ error: teachingsRes.error.message }, 502);
    if (profileRes.error) return jsonResponse({ error: profileRes.error.message }, 502);

    const connections = (connRes.data ?? []) as Array<{
      id: string;
      user_a: string;
      user_b: string;
    }>;
    if (connections.length === 0) {
      return jsonResponse({ ok: true, updated: 0, message: "No active partner connections." });
    }

    const beliefs = (beliefsRes.data ?? []) as Array<{
      topic: string;
      statement: string;
      layer: string;
    }>;
    const journalsRaw = (journalsRes.data ?? []) as Array<{
      id: string;
      title: string | null;
      body: string;
      entry_at_ts: string;
      entry_kind: string | null;
      mood: number | null;
    }>;
    const journals = journalsRaw.filter((j) => j.entry_kind !== "vent");

    const teachings = (teachingsRes.data ?? []) as Array<{
      title: string;
      summary: string | null;
      category: string;
      scriptures: string[];
    }>;

    const identityBlock = identitySummarySnippet(profileRes.data?.identity_summary ?? null);

    const journalSignals = journals.map((j) => ({
      month: j.entry_at_ts.slice(0, 7),
      title: j.title?.trim() || "(untitled)",
      mood: j.mood,
      excerpt: truncate(redactSensitiveText(j.body), 260),
    }));

    const beliefSignals = beliefs.map((b) => ({
      layer: b.layer,
      topic: b.topic,
      statement: truncate(redactSensitiveText(b.statement), 320),
    }));

    const teachingSignals = teachings.map((t) => ({
      title: t.title,
      category: t.category,
      summary: t.summary ? truncate(redactSensitiveText(t.summary), 240) : "",
      scriptures: (t.scriptures ?? []).slice(0, 4),
    }));

    const payload = {
      beliefs: beliefSignals,
      journal_signals: journalSignals,
      teachings_accepted: teachingSignals,
      identity_summary_excerpt: identityBlock || "(none)",
      window_days: WINDOW_DAYS,
      rules: {
        no_raw_quotes: true,
        no_third_party_names: true,
        no_locations: true,
        tone: "Warm, faith-aware, third person about the owner, suitable for their spouse or close friend to read with empathy.",
      },
    };

    const shareByConn = new Map<string, ShareRow>();
    for (const c of connections) {
      const { data: srow, error: sErr } = await supabase
        .from("partner_share_settings")
        .select(
          "share_summary,share_prayer_needs,share_recent_themes,share_testimony,share_mood_pulse",
        )
        .eq("connection_id", c.id)
        .eq("owner_user_id", uid)
        .maybeSingle();
      if (sErr) return jsonResponse({ error: sErr.message }, 502);
      shareByConn.set(c.id, (srow ?? DEFAULT_SHARE) as ShareRow);
    }

    const gateGroups = new Map<string, { gate: ShareRow; connectionIds: string[] }>();
    for (const c of connections) {
      const g = shareByConn.get(c.id)!;
      const key = shareGateKey(g);
      const prev = gateGroups.get(key);
      if (prev) prev.connectionIds.push(c.id);
      else gateGroups.set(key, { gate: g, connectionIds: [c.id] });
    }

    const parsedByGateKey = new Map<string, LlmOut>();
    for (const [key, { gate }] of gateGroups) {
      try {
        const parsed = await runGeminiModel(GEMINI_API_KEY, payload, gate);
        if (!parsed) {
          return jsonResponse({ error: "Model returned invalid JSON." }, 502);
        }
        parsedByGateKey.set(key, parsed);
      } catch (e) {
        return jsonResponse({ error: String(e) }, 502);
      }
    }

    let updated = 0;
    for (const c of connections) {
      const share = shareByConn.get(c.id)!;
      const key = shareGateKey(share);
      const parsedBase = parsedByGateKey.get(key);
      if (!parsedBase) return jsonResponse({ error: "Internal gate mismatch." }, 500);
      const gated = applyShareGates(share, parsedBase);

      const { error: upErr } = await supabase.from("partner_summaries").upsert(
        {
          connection_id: c.id,
          owner_user_id: uid,
          summary: gated.summary,
          recent_themes: gated.recent_themes,
          prayer_points: gated.prayer_points,
          season_label: gated.season_label || null,
          mood_pulse: gated.mood_pulse as Record<string, unknown> | null,
          entry_count: journals.length,
          generated_at: new Date().toISOString(),
          model: GEMINI_MODEL,
        },
        { onConflict: "connection_id,owner_user_id" },
      );
      if (upErr) return jsonResponse({ error: upErr.message }, 502);
      updated += 1;
    }

    return jsonResponse({ ok: true, updated, model: GEMINI_MODEL });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
