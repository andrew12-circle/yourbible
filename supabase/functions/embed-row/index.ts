import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMS = 768;
const MAX_TEXT_CHARS = 8000;
const BATCH_MAX = 25;
const MAX_ATTEMPTS = 3;

type TableName =
  | "belief_nodes"
  | "journal_entries"
  | "artifact_claims"
  | "knowledge_entities"
  | "my_ai_messages";

const TABLES: TableName[] = [
  "belief_nodes",
  "journal_entries",
  "artifact_claims",
  "knowledge_entities",
  "my_ai_messages",
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function composeText(table: TableName, row: Record<string, unknown>): string | null {
  switch (table) {
    case "belief_nodes": {
      const topic = String(row.topic ?? "").trim();
      const statement = String(row.statement ?? "").trim();
      const answer = String(row.answer ?? "").trim();
      const notes = String(row.notes ?? "").trim();
      const parts = [topic && `Topic: ${topic}`, statement && `Belief: ${statement}`, answer && `Answer: ${answer}`, notes && `Notes: ${notes}`].filter(Boolean);
      return parts.length ? parts.join("\n") : null;
    }
    case "journal_entries": {
      if (String(row.entry_kind ?? "") === "vent") return null;
      const title = String(row.title ?? "").trim();
      const summary = String(row.summary ?? "").trim();
      const body = String(row.body ?? "").trim();
      const text = summary || body;
      if (!text && !title) return null;
      return [title && `Title: ${title}`, text].filter(Boolean).join("\n");
    }
    case "artifact_claims": {
      const claim = String(row.claim ?? "").trim();
      const verdict = String(row.verdict ?? "").trim();
      if (!claim) return null;
      return verdict ? `Claim: ${claim}\nVerdict: ${verdict}` : claim;
    }
    case "knowledge_entities": {
      const title = String(row.title ?? "").trim();
      const subtitle = String(row.subtitle ?? "").trim();
      const kind = String(row.kind ?? "").trim();
      if (!title) return null;
      return [kind && `(${kind})`, title, subtitle && `— ${subtitle}`].filter(Boolean).join(" ");
    }
    case "my_ai_messages": {
      if (String(row.role ?? "") !== "assistant") return null;
      const content = String(row.content ?? "").trim();
      return content || null;
    }
  }
}

async function embedOne(text: string, geminiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: truncate(text, MAX_TEXT_CHARS) }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMS,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini embed ${res.status}: ${txt.slice(0, 300)}`);
  }
  const j = await res.json() as { embedding?: { values?: number[] } };
  const vec = j?.embedding?.values;
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) {
    throw new Error(`Bad embedding shape: ${vec?.length ?? "none"}`);
  }
  return vec;
}

function vecToLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function processJob(
  admin: SupabaseClient,
  geminiKey: string,
  job: { id: string; user_id: string; table_name: string; row_id: string; attempts: number },
): Promise<{ ok: boolean; error?: string }> {
  const table = job.table_name as TableName;
  if (!TABLES.includes(table)) {
    await admin.from("embedding_jobs").update({ status: "error", error: "unknown table", processed_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: false, error: "unknown table" };
  }

  // Claim
  const { error: claimErr } = await admin
    .from("embedding_jobs")
    .update({ status: "processing", attempts: job.attempts + 1 })
    .eq("id", job.id)
    .eq("status", "pending");
  if (claimErr) return { ok: false, error: claimErr.message };

  const { data: row, error: rowErr } = await admin
    .from(table)
    .select("*")
    .eq("id", job.row_id)
    .maybeSingle();

  if (rowErr) {
    await admin.from("embedding_jobs").update({ status: "error", error: rowErr.message, processed_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: false, error: rowErr.message };
  }
  if (!row) {
    await admin.from("embedding_jobs").update({ status: "done", error: "row missing", processed_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: true };
  }

  const text = composeText(table, row as Record<string, unknown>);
  if (!text) {
    // Nothing meaningful to embed; mark done with null embedding (clear stale if any).
    await admin.from(table).update({ embedding: null }).eq("id", job.row_id);
    await admin.from("embedding_jobs").update({ status: "done", processed_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: true };
  }

  try {
    const vec = await embedOne(text, geminiKey);
    const { error: upErr } = await admin.from(table).update({ embedding: vecToLiteral(vec) }).eq("id", job.row_id);
    if (upErr) throw new Error(upErr.message);
    await admin.from("embedding_jobs").update({ status: "done", processed_at: new Date().toISOString() }).eq("id", job.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const willRetry = job.attempts + 1 < MAX_ATTEMPTS;
    await admin.from("embedding_jobs").update({
      status: willRetry ? "pending" : "error",
      error: msg.slice(0, 500),
      processed_at: willRetry ? null : new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: false, error: msg };
  }
}

async function enqueueBackfillForUser(admin: SupabaseClient, userId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    let q = admin.from(table).select("id,user_id").eq("user_id", userId).is("embedding", null);
    if (table === "journal_entries") {
      q = q.or("entry_kind.is.null,entry_kind.neq.vent");
    }
    if (table === "my_ai_messages") {
      q = q.eq("role", "assistant");
    }
    const { data, error } = await q.limit(2000);
    if (error) throw new Error(`${table}: ${error.message}`);
    let n = 0;
    for (const r of (data ?? []) as { id: string; user_id: string }[]) {
      const { error: insErr } = await admin.from("embedding_jobs").insert({
        user_id: r.user_id,
        table_name: table,
        row_id: r.id,
        status: "pending",
      });
      // Unique partial index will reject duplicates; ignore those.
      if (!insErr) n += 1;
    }
    counts[table] = n;
  }
  return counts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return jsonResponse({ error: "GEMINI_API_KEY missing" }, 502);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const mode = typeof body.mode === "string" ? body.mode : "process";

    if (mode === "backfill") {
      // Requires authenticated user; scope to that user only.
      const auth = req.headers.get("Authorization") ?? "";
      const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
      const { data: userData, error: uErr } = await userClient.auth.getUser();
      if (uErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
      const counts = await enqueueBackfillForUser(admin, userData.user.id);
      return jsonResponse({ ok: true, enqueued: counts });
    }

    // mode === "process" — drain up to BATCH_MAX pending jobs (oldest first).
    const limit = Math.max(1, Math.min(BATCH_MAX, Number(body.limit) || BATCH_MAX));
    const { data: jobs, error: jErr } = await admin
      .from("embedding_jobs")
      .select("id,user_id,table_name,row_id,attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (jErr) return jsonResponse({ error: jErr.message }, 502);

    const list = (jobs ?? []) as { id: string; user_id: string; table_name: string; row_id: string; attempts: number }[];
    let ok = 0;
    let failed = 0;
    for (const job of list) {
      const r = await processJob(admin, GEMINI_API_KEY, job);
      if (r.ok) ok += 1; else failed += 1;
    }
    return jsonResponse({ ok: true, processed: list.length, succeeded: ok, failed });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});