import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  buildYouTubeAuthUrl,
  isYouTubeOAuthConfigured,
  sanitizeReturnPath,
} from "../_shared/youtubeOAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!isYouTubeOAuthConfigured()) {
      return new Response(JSON.stringify({ error: "YouTube OAuth is not configured on the server." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = (await req.json().catch(() => ({}))) as { return_path?: string };
    const returnPath = sanitizeReturnPath(body.return_path);
    const state = crypto.randomUUID();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    await admin.from("youtube_oauth_states").insert({
      user_id: u.user.id,
      state,
      return_path: returnPath,
    });

    return new Response(JSON.stringify({ auth_url: buildYouTubeAuthUrl(state) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
