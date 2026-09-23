import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL_ID = "eleven_v3";
const OUTPUT_FORMAT = "mp3_44100_128";

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const configuredVoice = Deno.env.get("ELEVENLABS_SCENE_VOICE_ID") || DEFAULT_VOICE_ID;
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY missing");

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: authData } = await userClient.auth.getUser();
    const user = authData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      scene_id?: string;
      text?: string;
      voice_id?: string;
      model_id?: string;
      speed?: number;
      stability?: number;
      similarity_boost?: number;
    };

    const sceneId = String(body.scene_id ?? "").trim();
    const text = String(body.text ?? "").trim();
    if (!sceneId || !text) {
      return new Response(JSON.stringify({ error: "scene_id and text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 20000) {
      return new Response(JSON.stringify({ error: "Scene is too long for narration" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voiceId = String(body.voice_id || configuredVoice).trim();
    const modelId = String(body.model_id || DEFAULT_MODEL_ID).trim();
    const settings = {
      stability: typeof body.stability === "number" ? body.stability : 0.48,
      similarity_boost: typeof body.similarity_boost === "number" ? body.similarity_boost : 0.78,
      speed: typeof body.speed === "number" ? body.speed : 0.93,
    };

    const fingerprint = await sha256(JSON.stringify({
      text,
      voiceId,
      modelId,
      outputFormat: OUTPUT_FORMAT,
      settings,
    }));

    const safeSceneId = sceneId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const storagePath = `${user.id}/morning-scenes/audio/${safeSceneId}/${fingerprint}.mp3`;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const existing = await admin.storage.from("voice-memos").download(storagePath);
    if (!existing.error && existing.data) {
      const { data: signed, error: signedError } = await admin.storage
        .from("voice-memos")
        .createSignedUrl(storagePath, 60 * 60 * 12);
      if (signedError) throw signedError;
      return new Response(JSON.stringify({
        ok: true,
        cached: true,
        storage_path: storagePath,
        audio_url: signed.signedUrl,
        fingerprint,
        voice_id: voiceId,
        model_id: modelId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eleven = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: settings,
        }),
      },
    );

    if (!eleven.ok) {
      const detail = await eleven.text();
      return new Response(JSON.stringify({ error: "ElevenLabs generation failed", detail: detail.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audio = await eleven.arrayBuffer();
    const { error: uploadError } = await admin.storage.from("voice-memos").upload(
      storagePath,
      audio,
      { upsert: false, contentType: "audio/mpeg" },
    );

    if (uploadError && !String(uploadError.message).toLowerCase().includes("already exists")) {
      throw uploadError;
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("voice-memos")
      .createSignedUrl(storagePath, 60 * 60 * 12);
    if (signedError) throw signedError;

    return new Response(JSON.stringify({
      ok: true,
      cached: false,
      storage_path: storagePath,
      audio_url: signed.signedUrl,
      fingerprint,
      voice_id: voiceId,
      model_id: modelId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
