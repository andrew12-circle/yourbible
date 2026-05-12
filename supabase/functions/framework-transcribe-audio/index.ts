// Transcribes an uploaded audio file (voice-memos bucket) via ElevenLabs STT,
// stores transcript on the artifact, and triggers framework-analyze.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVEN = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVEN) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artifact_id, storage_path, processing_token } = (await req.json()) as {
      artifact_id?: string;
      storage_path?: string;
      processing_token?: string;
    };
    if (!artifact_id || !storage_path || !processing_token) {
      return new Response(JSON.stringify({ error: "artifact_id, storage_path, and processing_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!storage_path.startsWith(`${u.user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: file, error: dlErr } = await admin.storage.from("voice-memos").download(storage_path);
    if (dlErr || !file) throw new Error(`download failed: ${dlErr?.message}`);

    const fd = new FormData();
    fd.append("file", file, storage_path.split("/").pop() ?? "audio");
    fd.append("model_id", "scribe_v1");

    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVEN },
      body: fd,
    });
    if (!r.ok) {
      const t = await r.text();
      const msg = `Transcription failed (${r.status})`;
      await userClient.from("artifacts").update({ status: "error", error: `${msg}: ${t.slice(0, 200)}` }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: msg, body: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const text: string = data.text ?? data.transcript ?? "";
    if (!text.trim()) {
      await userClient.from("artifacts").update({ status: "error", error: "Empty transcript." }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: "Empty transcript" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updated } = await userClient.from("artifacts").update({
      raw_text: text,
      status: "analyzing",
      error: null,
    }).eq("id", artifact_id).eq("processing_token", processing_token).select("id").maybeSingle();

    if (!updated) {
      return new Response(JSON.stringify({ ok: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    fetch(`${SUPABASE_URL}/functions/v1/framework-analyze`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ artifact_id, processing_token }),
    }).catch((e) => console.error(e));

    return new Response(JSON.stringify({ ok: true, length: text.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
