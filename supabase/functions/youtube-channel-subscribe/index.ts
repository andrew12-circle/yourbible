import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { resolveYouTubeChannel } from "../_shared/youtubeChannelData.ts";
import {
  bootstrapSubscriptionCursor,
  importRecentVideosForSubscription,
  type SubscriptionRow,
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

    if (req.method === "DELETE") {
      const body = (await req.json().catch(() => ({}))) as { subscription_id?: string };
      const subscriptionId = body.subscription_id?.trim();
      if (!subscriptionId) {
        return new Response(JSON.stringify({ error: "subscription_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin
        .from("youtube_channel_subscriptions")
        .delete()
        .eq("id", subscriptionId)
        .eq("user_id", u.user.id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      channel_input?: string;
      import_recent?: number;
    };
    const channelInput = body.channel_input?.trim();
    if (!channelInput) {
      return new Response(JSON.stringify({ error: "channel_input is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const channel = await resolveYouTubeChannel(channelInput);
    if (!channel) {
      return new Response(JSON.stringify({ error: "Could not resolve that YouTube channel." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await admin
      .from("youtube_channel_subscriptions")
      .select("*")
      .eq("user_id", u.user.id)
      .eq("channel_id", channel.channelId)
      .maybeSingle();

    let subscription: SubscriptionRow;
    if (existing) {
      subscription = existing as SubscriptionRow;
      await admin
        .from("youtube_channel_subscriptions")
        .update({
          channel_title: channel.title,
          channel_thumbnail_url: channel.thumbnailUrl,
          channel_handle: channel.handle,
          auto_import: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
    } else {
      const { data: inserted, error } = await admin
        .from("youtube_channel_subscriptions")
        .insert({
          user_id: u.user.id,
          channel_id: channel.channelId,
          channel_title: channel.title,
          channel_thumbnail_url: channel.thumbnailUrl,
          channel_handle: channel.handle,
          auto_import: true,
        })
        .select("*")
        .maybeSingle();
      if (error || !inserted) {
        return new Response(JSON.stringify({ error: error?.message ?? "Could not save subscription" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subscription = inserted as SubscriptionRow;
    }

    const importRecent = Math.min(Math.max(Number(body.import_recent) || 0, 0), 10);
    let importResult = null;

    if (importRecent > 0) {
      importResult = await importRecentVideosForSubscription(
        admin,
        SUPABASE_URL,
        SERVICE_ROLE,
        subscription,
        channel,
        importRecent,
      );
    } else if (!subscription.last_video_published_at) {
      await bootstrapSubscriptionCursor(admin, subscription.id, channel.uploadsPlaylistId);
    }

    return new Response(
      JSON.stringify({
        subscription: {
          id: subscription.id,
          channel_id: channel.channelId,
          channel_title: channel.title,
          channel_thumbnail_url: channel.thumbnailUrl,
          channel_handle: channel.handle,
        },
        import: importResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
