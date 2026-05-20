import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { embedDocument } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH = 40;

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    if (!SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE missing" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      artifact_id?: string;
      user_id?: string;
    };
    if (!body.artifact_id) {
      return new Response(JSON.stringify({ error: "artifact_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let q = admin
      .from("artifact_transcript_chunks")
      .select("id,text")
      .eq("artifact_id", body.artifact_id)
      .is("embedding", null)
      .limit(BATCH);
    if (body.user_id) q = q.eq("user_id", body.user_id);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let embedded = 0;
    for (const row of rows ?? []) {
      const text = String(row.text ?? "").trim();
      if (!text) continue;
      const vec = await embedDocument(text);
      if (!vec) continue;
      const { error: upErr } = await admin
        .from("artifact_transcript_chunks")
        .update({ embedding: vecLiteral(vec) })
        .eq("id", row.id);
      if (!upErr) embedded += 1;
    }

    return new Response(JSON.stringify({ ok: true, embedded, pending: (rows ?? []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
