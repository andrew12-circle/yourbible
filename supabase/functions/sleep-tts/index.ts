// Sleep narrator — ElevenLabs streaming TTS for calm scripture playback.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { requireUser } from "../_shared/requireUser.ts";

interface Body {
  text: string;
  voiceId?: string;
}

/** Default Sarah — soft, warm; matches SleepPage VOICES[0]. */
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/** Best long-form narration quality; override with ELEVENLABS_TTS_MODEL if needed. */
const DEFAULT_MODEL = "eleven_multilingual_v2";

function normalizeTtsText(text: string): string {
  return text
    .replace(/\[[\d]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;

    const KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");

    const modelId = Deno.env.get("ELEVENLABS_TTS_MODEL") ?? DEFAULT_MODEL;

    const { text, voiceId = DEFAULT_VOICE_ID } = (await req.json()) as Body;
    if (!text || text.length === 0) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmed = normalizeTtsText(text.length > 4500 ? text.slice(0, 4500) : text);
    if (!trimmed) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmed,
          model_id: modelId,
          voice_settings: {
            stability: 0.78,
            similarity_boost: 0.82,
            style: 0.12,
            use_speaker_boost: true,
            speed: 0.85,
          },
        }),
      }
    );

    if (!r.ok || !r.body) {
      const t = await r.text();
      console.error("ElevenLabs error:", r.status, t);
      return new Response(JSON.stringify({ error: `ElevenLabs ${r.status}` }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
  } catch (e) {
    console.error("sleep-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
