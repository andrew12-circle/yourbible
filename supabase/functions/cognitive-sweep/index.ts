// Nightly (or on-demand) sweep that rebuilds each user's living cognitive state:
// worldview_summary, evolution_summary, recurring_themes, unresolved_tensions,
// current_season, voice_signature, core_frameworks. Uses Gemini.
//
// Invocation modes:
//   POST { user_id: "uuid" }            — sweep one user (sync, returns state)
//   POST { all: true, limit?: 25 }      — sweep up to N users with recent activity (cron-friendly)
//   POST {}                              — same as { all: true }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";

type Json = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stripFence(t: string): string {
  const s = t.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  return m ? m[1].trim() : s;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

async function callGemini(systemText: string, userText: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 400)}`);
  }
  const j: unknown = await res.json();
  if (!isRecord(j)) return "";
  const cands = (j as Json).candidates;
  if (!Array.isArray(cands) || !cands.length) return "";
  const first = cands[0];
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

const SWEEP_SYSTEM = `You are the cognitive cartographer for a single user's living worldview file.

You read a bundle of their recent journals, top beliefs, belief trajectories, open tensions, recent assistant replies, and prior cognitive state. You output a compact JSON document that another AI will use as the user's ambient identity context.

Hard rules:
- Do NOT invent beliefs, events, people, or convictions not grounded in the inputs.
- Prefer the user's own phrasing and voice over generic theological vocabulary.
- Track CHANGE, not just state. If something has shifted from the prior state, name the shift in evolution_summary.
- Keep each field tight and specific. Generic spiritual platitudes are failures.
- Output a single JSON object only (no markdown fences). Schema:

{
  "worldview_summary": "120-220 words. Their current way of seeing God, self, others, suffering, scripture. Specific. Voice-matched. No filler.",
  "evolution_summary": "60-160 words. What has shifted recently and from what to what. Empty string '' if no real shift detected.",
  "recurring_themes": ["6-12 short noun phrases, lowercase, no hashtags"],
  "unresolved_tensions": ["3-8 sentence-length tensions the user is sitting in, in their voice"],
  "current_season": "8-18 word phrase like 'wilderness after burnout, learning to receive instead of perform'",
  "voice_signature": "60-140 words describing how they actually talk: cadence, recurring metaphors, words they reach for, what they avoid. Concrete.",
  "core_frameworks": ["4-10 short labels for load-bearing frameworks they use to interpret life, e.g. 'covenant over contract', 'rest as resistance'"]
}`;

type BeliefRow = { id: string; statement: string; topic: string; layer: string; confidence: number; is_core: boolean; updated_at: string };
type JournalRow = { id: string; title: string | null; body: string; summary: string | null; entry_at_ts: string };
type TensionRow = { id: string; summary: string; severity: number };
type AsstRow = { id: string; content: string; created_at: string };
type VersionRow = { belief_id: string; snapshot: unknown; created_at: string };

function bundleForUser(args: {
  beliefs: BeliefRow[];
  journals: JournalRow[];
  tensions: TensionRow[];
  assistants: AsstRow[];
  versions: VersionRow[];
  prior: Json | null;
}): string {
  const { beliefs, journals, tensions, assistants, versions, prior } = args;
  const parts: string[] = [];

  if (prior) {
    parts.push("## Prior cognitive state (last sweep)\n" + truncate(JSON.stringify(prior), 2400));
  } else {
    parts.push("## Prior cognitive state\n(none — first sweep)");
  }

  parts.push(
    "## Top beliefs (core + high-confidence + recently updated)\n" +
      (beliefs.length
        ? beliefs
          .map((b) =>
            `- (${b.layer}${b.is_core ? "·core" : ""}, conf ${b.confidence}, ${b.updated_at.slice(0, 10)}) ${b.topic}: ${truncate(b.statement, 320)}`
          )
          .join("\n")
        : "(none)"),
  );

  // Trajectory pairs: for any belief that has >=2 versions, show earlier vs latest statement.
  const perBelief = new Map<string, { snapshot: unknown; created_at: string }[]>();
  for (const v of versions) {
    const list = perBelief.get(v.belief_id) ?? [];
    if (list.length < 2) list.push({ snapshot: v.snapshot, created_at: v.created_at });
    perBelief.set(v.belief_id, list);
  }
  const trajLines: string[] = [];
  for (const [bid, vs] of perBelief) {
    if (vs.length < 2) continue;
    const stOf = (s: unknown): string =>
      isRecord(s) && typeof s.statement === "string" ? s.statement : "";
    const newer = stOf(vs[0].snapshot);
    const older = stOf(vs[1].snapshot);
    if (!newer || !older || newer === older) continue;
    trajLines.push(
      `- belief ${bid.slice(0, 8)}…: EARLIER "${truncate(older, 220)}" → LATER "${truncate(newer, 220)}"`,
    );
  }
  parts.push(
    "## Belief trajectories (use to write evolution_summary; do not invent)\n" +
      (trajLines.length ? trajLines.join("\n") : "(none recorded)"),
  );

  parts.push(
    "## Open tensions\n" +
      (tensions.length
        ? tensions.map((t) => `- (sev ${t.severity}) ${truncate(t.summary, 300)}`).join("\n")
        : "(none)"),
  );

  parts.push(
    "## Recent journals (oldest first)\n" +
      (journals.length
        ? journals
          .slice()
          .sort((a, b) => a.entry_at_ts.localeCompare(b.entry_at_ts))
          .map((j) => {
            const title = j.title?.trim() || "(untitled)";
            const text = (j.summary?.trim() || j.body || "").replace(/\s+/g, " ").trim();
            return `- ${j.entry_at_ts.slice(0, 10)} ${title}: ${truncate(text, 500)}`;
          })
          .join("\n")
        : "(none)"),
  );

  parts.push(
    "## Recent assistant replies (their AI's recent voice with them)\n" +
      (assistants.length
        ? assistants
          .map((m) => `- ${m.created_at.slice(0, 10)}: ${truncate(m.content.replace(/\s+/g, " "), 360)}`)
          .join("\n")
        : "(none)"),
  );

  // Shrink to ~16k chars to leave room for system instructions.
  const body = parts.join("\n\n");
  return body.length <= 16_000 ? body : body.slice(0, 15_999) + "…";
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function sweepOneUser(admin: SupabaseAdmin, geminiKey: string, userId: string): Promise<Json> {
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const since120 = new Date(Date.now() - 120 * 86_400_000).toISOString();

  const [bRes, jRes, tRes, mRes, sRes] = await Promise.all([
    admin
      .from("belief_nodes")
      .select("id,statement,topic,layer,confidence,is_core,updated_at")
      .eq("user_id", userId)
      .order("is_core", { ascending: false })
      .order("confidence", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(40),
    admin
      .from("journal_entries")
      .select("id,title,body,summary,entry_at_ts,entry_kind")
      .eq("user_id", userId)
      .or("entry_kind.is.null,entry_kind.neq.vent")
      .gte("entry_at_ts", since30)
      .order("entry_at_ts", { ascending: false })
      .limit(40),
    admin
      .from("belief_tensions")
      .select("id,summary,severity,status")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("severity", { ascending: false })
      .limit(20),
    admin
      .from("my_ai_messages")
      .select("id,content,created_at,role")
      .eq("user_id", userId)
      .eq("role", "assistant")
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("user_cognitive_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const beliefs = ((bRes.data ?? []) as BeliefRow[]);
  // Versions: only for beliefs we're feeding in
  let versions: VersionRow[] = [];
  if (beliefs.length) {
    const ids = beliefs.map((b) => b.id);
    const { data: vRows } = await admin
      .from("belief_versions")
      .select("belief_id,snapshot,created_at")
      .eq("user_id", userId)
      .in("belief_id", ids)
      .gte("created_at", since120)
      .order("created_at", { ascending: false })
      .limit(120);
    versions = (vRows ?? []) as VersionRow[];
  }

  const prior = sRes.data
    ? {
        worldview_summary: sRes.data.worldview_summary,
        evolution_summary: sRes.data.evolution_summary,
        recurring_themes: sRes.data.recurring_themes,
        unresolved_tensions: sRes.data.unresolved_tensions,
        current_season: sRes.data.current_season,
        voice_signature: sRes.data.voice_signature,
        core_frameworks: sRes.data.core_frameworks,
        last_swept_at: sRes.data.last_swept_at,
      } as Json
    : null;

  const journals = (jRes.data ?? []) as JournalRow[];
  const tensions = (tRes.data ?? []) as TensionRow[];
  const assistants = (mRes.data ?? []) as AsstRow[];

  // If absolutely nothing to learn from, just stamp and return.
  if (!beliefs.length && !journals.length && !tensions.length && !assistants.length && !prior) {
    return { skipped: "no_data", user_id: userId };
  }

  const userPayload = bundleForUser({ beliefs, journals, tensions, assistants, versions, prior });
  const rawText = await callGemini(SWEEP_SYSTEM, userPayload, geminiKey);
  const parsed = (() => {
    try {
      const p = JSON.parse(stripFence(rawText));
      return isRecord(p) ? p : null;
    } catch {
      return null;
    }
  })();
  if (!parsed) {
    return { error: "gemini_returned_unparseable", user_id: userId, raw: rawText.slice(0, 400) };
  }

  const asStr = (v: unknown, def = ""): string => (typeof v === "string" ? v.trim() : def);
  const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  const next = {
    user_id: userId,
    worldview_summary: asStr(parsed.worldview_summary),
    evolution_summary: asStr(parsed.evolution_summary),
    recurring_themes: asArr(parsed.recurring_themes).filter((x) => typeof x === "string").slice(0, 16),
    unresolved_tensions: asArr(parsed.unresolved_tensions).filter((x) => typeof x === "string").slice(0, 12),
    current_season: asStr(parsed.current_season),
    voice_signature: asStr(parsed.voice_signature),
    core_frameworks: asArr(parsed.core_frameworks).filter((x) => typeof x === "string").slice(0, 12),
    model: GEMINI_MODEL,
    last_swept_at: new Date().toISOString(),
    inputs_signature: `${beliefs.length}b/${journals.length}j/${tensions.length}t/${assistants.length}a`,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await admin
    .from("user_cognitive_state")
    .upsert(next, { onConflict: "user_id" });
  if (upErr) return { error: upErr.message, user_id: userId };

  await admin.from("user_cognitive_state_versions").insert({
    user_id: userId,
    snapshot: next,
  });

  return { ok: true, user_id: userId, inputs_signature: next.inputs_signature };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 502);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { user_id?: string; all?: boolean; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    if (body.user_id) {
      const result = await sweepOneUser(admin, GEMINI_API_KEY, body.user_id);
      return json(result);
    }

    // Batch: find users with recent activity OR with existing state not swept in 20+ hours.
    const limit = Math.max(1, Math.min(50, Number(body.limit ?? 25)));
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const stale = new Date(Date.now() - 20 * 3600_000).toISOString();

    const [j, b, s] = await Promise.all([
      admin.from("journal_entries").select("user_id").gte("entry_at_ts", since).limit(500),
      admin.from("my_ai_messages").select("user_id").gte("created_at", since).limit(500),
      admin.from("user_cognitive_state").select("user_id,last_swept_at").lte("last_swept_at", stale).limit(500),
    ]);

    const userSet = new Set<string>();
    for (const r of (j.data ?? []) as { user_id: string }[]) userSet.add(r.user_id);
    for (const r of (b.data ?? []) as { user_id: string }[]) userSet.add(r.user_id);
    for (const r of (s.data ?? []) as { user_id: string }[]) userSet.add(r.user_id);

    const userIds = [...userSet].slice(0, limit);
    const results: unknown[] = [];
    for (const uid of userIds) {
      try {
        results.push(await sweepOneUser(admin, GEMINI_API_KEY, uid));
      } catch (e) {
        results.push({ user_id: uid, error: String(e) });
      }
    }
    return json({ ok: true, swept: results.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});