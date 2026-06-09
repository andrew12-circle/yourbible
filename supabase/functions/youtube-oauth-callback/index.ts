import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  appOrigin,
  exchangeCodeForTokens,
  fetchMyYouTubeChannel,
  isYouTubeOAuthConfigured,
  upsertYouTubeConnection,
} from "../_shared/youtubeOAuth.ts";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    const redirectWith = (params: Record<string, string>) => {
      const dest = new URL(`${appOrigin()}/settings`);
      for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v);
      return Response.redirect(dest.toString(), 302);
    };

    if (oauthError) {
      return redirectWith({ youtube: "error", reason: oauthError });
    }
    if (!code || !state) {
      return redirectWith({ youtube: "error", reason: "missing_code" });
    }
    if (!isYouTubeOAuthConfigured()) {
      return redirectWith({ youtube: "error", reason: "not_configured" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE) {
      return redirectWith({ youtube: "error", reason: "server_misconfigured" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: stateRow } = await admin
      .from("youtube_oauth_states")
      .select("user_id,return_path,expires_at")
      .eq("state", state)
      .maybeSingle();

    if (!stateRow?.user_id) {
      return redirectWith({ youtube: "error", reason: "invalid_state" });
    }
    const expiresAt = stateRow.expires_at ? new Date(stateRow.expires_at as string).getTime() : 0;
    if (expiresAt > 0 && expiresAt < Date.now()) {
      return redirectWith({ youtube: "error", reason: "state_expired" });
    }

    await admin.from("youtube_oauth_states").delete().eq("state", state);

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      const reason = tokens.error_description ?? tokens.error ?? "token_exchange_failed";
      return redirectWith({ youtube: "error", reason });
    }

    const channel = await fetchMyYouTubeChannel(tokens.access_token);
    await upsertYouTubeConnection(admin, stateRow.user_id as string, tokens, channel);

    const returnPath = typeof stateRow.return_path === "string" ? stateRow.return_path : "/settings";
    const dest = new URL(`${appOrigin()}${returnPath}`);
    dest.searchParams.set("youtube", "connected");
    if (channel?.title) dest.searchParams.set("channel", channel.title);
    return Response.redirect(dest.toString(), 302);
  } catch (e) {
    const dest = new URL(`${appOrigin()}/settings`);
    dest.searchParams.set("youtube", "error");
    dest.searchParams.set("reason", String((e as Error).message ?? e).slice(0, 120));
    return Response.redirect(dest.toString(), 302);
  }
});
