/**
 * AI title + summary for journal entries (video transcripts, long dictation, etc.).
 * Persists to journal_entries when entry_id is provided.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  generateJournalEntryMeta,
  needsAutoJournalTitle,
  stripJournalBodyForMeta,
} from "../_shared/journalEntryMeta.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SUMMARY_CHARS = 40;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      entry_id?: string;
      body?: string;
      text?: string;
      source?: string;
      force?: boolean;
    };

    const entryId = typeof body.entry_id === "string" ? body.entry_id : null;
    const source = body.source === "video" ? "video" : "default";
    const force = body.force === true;

    let entry: {
      id: string;
      title: string | null;
      body: string | null;
      summary: string | null;
      user_id: string;
      e2e_encrypted: boolean | null;
    } | null = null;

    if (entryId) {
      const { data } = await supabase
        .from("journal_entries")
        .select("id,title,body,summary,user_id,e2e_encrypted")
        .eq("id", entryId)
        .maybeSingle();
      if (!data || data.user_id !== u.user.id) {
        return new Response(JSON.stringify({ error: "Entry not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      entry = data as typeof entry;
      if (entry.e2e_encrypted === true) {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "e2e_encrypted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const inlineText =
      (typeof body.text === "string" ? body.text : "") ||
      (typeof body.body === "string" ? body.body : "");
    const prose = stripJournalBodyForMeta(
      inlineText || String(entry?.body ?? ""),
    );

    if (prose.length < MIN_SUMMARY_CHARS) {
      return new Response(JSON.stringify({ error: "Not enough text for a summary" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const needsTitle = entry ? needsAutoJournalTitle(entry.title) && prose.length >= 20 : false;
    const needsSummary =
      force || (entry ? !String(entry.summary ?? "").trim() && prose.length >= MIN_SUMMARY_CHARS : true);

    if (!needsTitle && !needsSummary) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          title: entry?.title?.trim() ?? null,
          summary: entry?.summary?.trim() ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const generated = await generateJournalEntryMeta({
      prose,
      source,
      needsTitle,
      needsSummary,
    });

    let persisted = false;
    if (entryId && entry && (generated.title || generated.summary)) {
      const patch: Record<string, string> = {};
      if (generated.title) patch.title = generated.title;
      if (generated.summary) patch.summary = generated.summary;
      const { error: upErr } = await supabase
        .from("journal_entries")
        .update(patch)
        .eq("id", entryId)
        .eq("user_id", u.user.id);
      persisted = !upErr;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        title: generated.title,
        summary: generated.summary,
        persisted,
        skipped: !generated.title && !generated.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("journal-suggest-summary:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
