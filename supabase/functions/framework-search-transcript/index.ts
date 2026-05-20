import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { getEmbedding } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { artifact_id?: string; query?: string; limit?: number };
    const query = (body.query ?? "").trim();
    if (!query) {
      return new Response(JSON.stringify({ hits: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vec = await getEmbedding(query);
    if (!vec) {
      return new Response(JSON.stringify({ hits: [], semantic: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("match_artifact_transcript", {
      query_embedding: vecLiteral(vec),
      match_count: Math.min(20, Math.max(1, body.limit ?? 8)),
      filter_artifact_id: body.artifact_id ?? null,
    });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ hits: data ?? [], semantic: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
