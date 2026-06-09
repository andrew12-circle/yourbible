import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { resolveYouTubeChannel } from "../_shared/youtubeChannelData.ts";
import {
  syncSubscriptionNewUploads,
  type SubscriptionRow,
  type SyncImportResult,
} from "../_shared/youtubeSubscriptionSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = Boolean((body as { force?: boolean }).force);

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: subs, error } = await admin
      .from("youtube_channel_subscriptions")
      .select("*")
      .eq("user_id", u.user.id)
      .eq("auto_import", true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: SyncImportResult[] = [];
    for (const row of (subs ?? []) as SubscriptionRow[]) {
      const channel = await resolveYouTubeChannel(row.channel_id);
      if (!channel) {
        console.warn("[youtube-subscription-sync] could not resolve channel", row.channel_id);
        continue;
      }
      const result = await syncSubscriptionNewUploads(
        admin,
        SUPABASE_URL,
        SERVICE_ROLE,
        row,
        channel,
        force,
      );
      results.push(result);
    }

    const imported = results.reduce((sum, r) => sum + r.imported, 0);
    return new Response(
      JSON.stringify({ imported, subscriptions: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
