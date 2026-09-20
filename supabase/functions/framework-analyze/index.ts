import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { planArtifactAnalysis } from "../_shared/artifactAnalysisContract.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!service) return reply({ error: "Analysis worker is not configured." }, 503);
    const client = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return reply({ error: "Sign in to analyze this source." }, 401);
    const body = await req.json();
    if (typeof body.artifact_id !== "string" || typeof body.processing_token !== "string") return reply({ error: "artifact_id and processing_token required" }, 400);
    const { data: artifact, error } = await client.from("artifacts").select("id,user_id,raw_text,processing_token")
      .eq("id", body.artifact_id).eq("user_id", auth.user.id).maybeSingle();
    if (error || !artifact) return reply({ error: "Artifact not found" }, 404);
    if (artifact.processing_token !== body.processing_token) return reply({ ok: true, stale: true }, 409);
    const rawText = String(artifact.raw_text ?? "");
    const batches = planArtifactAnalysis(rawText);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawText));
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    const db = createClient(url, service);
    // The service token is vaulted, never returned to a client or written to logs.
    const configured = await db.rpc("artifact_analysis_configure_dispatcher", { p_url: `${url}/functions/v1/artifact-analysis-worker`, p_token: service });
    if (configured.error) return reply({ error: "Durable analysis dispatcher is not installed. Apply the analysis migrations and deploy the worker. Previous research is unchanged." }, 503);
    const started = await db.rpc("artifact_analysis_start", {
      p_artifact_id: artifact.id, p_user_id: auth.user.id, p_token: body.processing_token,
      p_text: rawText, p_hash: hash, p_batches: batches, p_resume: body.resume === true,
    });
    if (started.error) return reply({ error: "Could not create a consistent analysis snapshot. Reload and retry; saved research is unchanged." }, 409);
    const dispatched = await db.rpc("artifact_analysis_dispatch");
    return reply({ ok: true, queued: true, run_id: started.data, sections: batches.length,
      dispatch_pending: Boolean(dispatched.error) }, 202);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Could not start analysis." }, 400);
  }
});
