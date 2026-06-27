import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  appOrigin,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  isGoogleDriveOAuthConfigured,
  upsertGoogleDriveConnection,
} from "../_shared/googleDriveOAuth.ts";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    const redirectWith = (params: Record<string, string>) => {
      const dest = new URL(`${appOrigin()}/settings`);
      dest.searchParams.set("section", "storage");
      for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v);
      return Response.redirect(dest.toString(), 302);
    };

    if (oauthError) {
      return redirectWith({ gdrive: "error", reason: oauthError });
    }
    if (!code || !state) {
      return redirectWith({ gdrive: "error", reason: "missing_code" });
    }
    if (!isGoogleDriveOAuthConfigured()) {
      return redirectWith({ gdrive: "error", reason: "not_configured" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE) {
      return redirectWith({ gdrive: "error", reason: "server_misconfigured" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: stateRow } = await admin
      .from("google_drive_oauth_states")
      .select("user_id,return_path,expires_at")
      .eq("state", state)
      .maybeSingle();

    if (!stateRow?.user_id) {
      return redirectWith({ gdrive: "error", reason: "invalid_state" });
    }
    const expiresAt = stateRow.expires_at ? new Date(stateRow.expires_at as string).getTime() : 0;
    if (expiresAt > 0 && expiresAt < Date.now()) {
      return redirectWith({ gdrive: "error", reason: "state_expired" });
    }

    await admin.from("google_drive_oauth_states").delete().eq("state", state);

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      const reason = tokens.error_description ?? tokens.error ?? "token_exchange_failed";
      return redirectWith({ gdrive: "error", reason });
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token);
    await upsertGoogleDriveConnection(admin, stateRow.user_id as string, tokens, email);

    const returnPath = typeof stateRow.return_path === "string"
      ? stateRow.return_path
      : "/settings?section=storage";
    const dest = new URL(`${appOrigin()}${returnPath}`);
    dest.searchParams.set("gdrive", "connected");
    if (email) dest.searchParams.set("email", email);
    return Response.redirect(dest.toString(), 302);
  } catch (e) {
    const dest = new URL(`${appOrigin()}/settings`);
    dest.searchParams.set("section", "storage");
    dest.searchParams.set("gdrive", "error");
    dest.searchParams.set("reason", String((e as Error).message ?? e).slice(0, 120));
    return Response.redirect(dest.toString(), 302);
  }
});
