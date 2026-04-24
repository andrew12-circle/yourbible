// Sleep narrator — ElevenLabs streaming TTS for calm scripture playback.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body {
  text: string;
  voiceId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");

    const { text, voiceId = "EXAVITQu4vr4xnSDxMaL" } = (await req.json()) as Body; // Sarah default
    if (!text || text.length === 0) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmed = text.length > 4500 ? text.slice(0, 4500) : text;

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
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true,
            speed: 0.9,
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
