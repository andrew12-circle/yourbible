/**
 * AI title + summary for journal entries (video transcripts, long dictation, etc.).
 * Persists only for the authenticated user's non-E2E entry.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SUMMARY_CHARS = 40;

function needsAutoTitle(title: string | null | undefined): boolean {
  const t = String(title ?? "").trim();
  if (!t) return true;
  return /^(entry|untitled|new\s+(journal|entry)(?:\s+entry)?|journal\s+entry|title|video journal\s·.*)$/i.test(t);
}

function stripBody(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^\*\*From your sketch\*\*[^\n]*\n+/im, "")
    .replace(/^---\n/gm, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateMeta(opts: {
  prose: string;
  source: "video" | "default";
  needsTitle: boolean;
  needsSummary: boolean;
}) {
  const key = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const system = opts.source === "video"
    ? `You distill a private faith video journal transcript. Reply with ONLY JSON: {"title":"..."|null,"summary":"..."|null}. Title: 4–12 words, sentence case, no trailing period. Summary: 3–6 concise bullet points beginning with "- ", <=700 chars total. Never invent details.`
    : `You help title and summarize a private faith journal entry. Reply with ONLY JSON: {"title":"..."|null,"summary":"..."|null}. Title: 4–12 words, sentence case, no trailing period. Summary: one warm, specific paragraph of 2–4 sentences, <=500 chars. Never invent details.`;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Entry text:\n\n${opts.prose.slice(0, 12000)}` },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`AI summary failed (${res.status})`);
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("AI summary returned no content");
  const parsed = JSON.parse(raw) as { title?: string | null; summary?: string | null };
  return {
    title: opts.needsTitle && typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 120)
      : null,
    summary: opts.needsSummary && typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 900)
      : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = (await req.json()) as { entry_id?: string; body?: string; text?: string; source?: string; force?: boolean };
    const entryId = typeof body.entry_id === "string" ? body.entry_id : null;
    const source = body.source === "video" ? "video" : "default";
    const force = body.force === true;

    let entry: { id: string; title: string | null; body: string | null; summary: string | null; user_id: string; e2e_encrypted: boolean | null; revision: number } | null = null;
    if (entryId) {
      const { data, error } = await supabase.from("journal_entries").select("id,title,body,summary,user_id,e2e_encrypted,revision").eq("id", entryId).maybeSingle();
      if (error) throw error;
      if (!data || data.user_id !== u.user.id) return new Response(JSON.stringify({ error: "Entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      entry = data as typeof entry;
      if (entry.e2e_encrypted === true) return new Response(JSON.stringify({ ok: true, skipped: true, reason: "e2e_encrypted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inline = (typeof body.text === "string" ? body.text : "") || (typeof body.body === "string" ? body.body : "");
    const prose = stripBody(inline || String(entry?.body ?? ""));
    if (prose.length < MIN_SUMMARY_CHARS) return new Response(JSON.stringify({ error: "Not enough text for a summary" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const needsTitle = entry ? needsAutoTitle(entry.title) && prose.length >= 20 : false;
    const needsSummary = force || (entry ? !String(entry.summary ?? "").trim() : true);
    if (!needsTitle && !needsSummary) return new Response(JSON.stringify({ ok: true, skipped: true, title: entry?.title?.trim() ?? null, summary: entry?.summary?.trim() ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const generated = await generateMeta({ prose, source, needsTitle, needsSummary });
    let persisted = false;
    if (entryId && entry && (generated.title || generated.summary)) {
      const patch: Record<string, string> = {};
      if (generated.title) patch.title = generated.title;
      if (generated.summary) patch.summary = generated.summary;
      const { data: updated, error } = await supabase
        .from("journal_entries")
        .update(patch)
        .eq("id", entryId)
        .eq("user_id", u.user.id)
        .eq("revision", entry.revision)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      persisted = Boolean(updated);
    }

    return new Response(JSON.stringify({ ok: true, title: generated.title, summary: generated.summary, persisted, skipped: !generated.title && !generated.summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("journal-suggest-summary:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
