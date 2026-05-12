// Reads UTF-8 text from a file in artifact-uploads (for large .txt / .md imports from the client).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RAW_TEXT = 5_000_000;

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      storage_path?: string;
      processing_token?: string;
      title?: string;
      original_filename?: string;
    };
    const { storage_path, processing_token, title, original_filename } = body;

    if (!storage_path || !processing_token) {
      return new Response(JSON.stringify({ error: "storage_path and processing_token are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!storage_path.startsWith(`${u.user.id}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: fileBlob, error: dlErr } = await admin.storage.from("artifact-uploads").download(storage_path);
    if (dlErr || !fileBlob) {
      return new Response(JSON.stringify({ error: `Download failed: ${dlErr?.message ?? "unknown"}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const raw_text_full = new TextDecoder("utf-8", { fatal: false }).decode(buf).trim();
    if (!raw_text_full) {
      return new Response(JSON.stringify({ error: "File is empty or could not be decoded as UTF-8." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = original_filename ?? basename(storage_path);
    const meta: Record<string, unknown> = {
      source: "text_file",
      original_filename: name,
      import_via: "storage",
    };

    let raw_text = raw_text_full;
    if (raw_text.length > MAX_RAW_TEXT) {
      meta.truncated = true;
      meta.truncated_note = `Text was truncated from ${raw_text.length} characters to ${MAX_RAW_TEXT}.`;
      raw_text = raw_text.slice(0, MAX_RAW_TEXT);
    }

    const firstLine = raw_text.split(/\r?\n/).find((l) => l.trim())?.trim().slice(0, 200);
    const artifactTitle = (title?.trim() || firstLine || name).slice(0, 500);

    const { data: row, error: insErr } = await userClient
      .from("artifacts")
      .insert({
        user_id: u.user.id,
        title: artifactTitle,
        kind: "text_file",
        url: null,
        raw_text,
        status: "analyzing",
        processing_token,
        metadata: meta,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !row) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    fetch(`${SUPABASE_URL}/functions/v1/framework-analyze`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ artifact_id: row.id, processing_token }),
    }).catch((e) => console.error(e));

    await admin.storage.from("artifact-uploads").remove([storage_path]).catch((e) => console.error(e));

    return new Response(JSON.stringify({ ok: true, artifact_id: row.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
