import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { auditLibraryIndex, reindexLibraryForUser } from "../_shared/libraryIndexCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const mode = typeof body.mode === "string" ? body.mode : "status";

    if (mode === "reindex") {
      const drainLimit = Math.max(5, Math.min(40, Number(body.drain_limit) || 30));
      const drainRounds = Math.max(1, Math.min(12, Number(body.drain_rounds) || 6));
      const result = await reindexLibraryForUser(admin, userId, drainLimit, drainRounds);
      return jsonResponse({ ok: true, ...result });
    }

    const status = await auditLibraryIndex(admin, userId);
    return jsonResponse({ ok: true, ...status });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
