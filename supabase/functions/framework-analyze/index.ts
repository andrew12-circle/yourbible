import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { splitTranscript } from "../_shared/transcriptSlice.ts";
import { canonicalSourceSegments, planAnalysisBatches } from "../_shared/artifactFindingContract.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Authentication required" }, 401);
    const body = await request.json();
    const { artifact_id, processing_token } = body;
    if (typeof artifact_id !== "string" || typeof processing_token !== "string" || processing_token.length > 200) {
      return json({ error: "artifact_id and processing_token required" }, 400);
    }
    const { data: artifact, error } = await userClient.from("artifacts")
      .select("id,user_id,processing_token,raw_text,metadata").eq("id", artifact_id).eq("user_id", auth.user.id).maybeSingle();
    if (error || !artifact) return json({ error: "Artifact not found" }, 404);
    if (artifact.processing_token !== processing_token) return json({ error: "Stale analysis request" }, 409);
    const raw = String(artifact.raw_text ?? "");
    if (raw.trim().length < 80) return json({ error: "Save a transcript before analyzing" }, 400);
    if (raw.length > 4_000_000) return json({ error: "This source exceeds the supported analysis size. Split it into smaller documents; no content has been discarded." }, 413);
    const segments = canonicalSourceSegments(splitTranscript(raw).segments);
    const batches = planAnalysisBatches(segments);
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hash = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: runId, error: startError } = await admin.rpc("artifact_start_analysis", {
      p_artifact_id: artifact_id, p_user_id: auth.user.id, p_processing_token: processing_token,
      p_content_hash: hash, p_segments: segments, p_batches: batches,
      p_source: artifact.metadata?.transcript_provider ?? "saved_transcript", p_resume: body.resume === true,
    });
    if (startError) {
      console.error("Analysis enqueue failed", startError.code);
      return json({ error: startError.code === "40001" ? "Transcript changed. Reload and try again." : "Could not queue analysis. Verify the analysis migration is deployed; existing research is unchanged." }, startError.code === "40001" ? 409 : 503);
    }
    // This kick is only a latency optimization. The database scheduler owns recovery.
    const kick = fetch(`${url}/functions/v1/framework-analysis-worker`, {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId }),
    }).then((r) => { if (!r.ok) console.warn("Analysis worker kick failed", r.status); })
      .catch(() => console.warn("Analysis worker kick deferred to scheduler"));
    const runtime = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (runtime) runtime.waitUntil(kick); else await kick;
    return json({ ok: true, queued: true, run_id: runId, total_batches: batches.length }, 202);
  } catch (error) {
    console.error("Analysis request failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "Could not queue analysis. Saved research is unchanged." }, 500);
  }
});
