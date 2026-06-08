// Server-side library comparison for one artifact (embeddings + vector match, no client vector download).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  countClaimsMissingEmbeddings,
  drainPendingEmbeddingJobs,
} from "../_shared/embeddingJobDrain.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CORPUS_MIN_SIMILARITY = 0.72;
const CORPUS_MAX_PEERS = 12;

type CorpusPeerRow = {
  peer_artifact_id: string;
  avg_similarity: number;
  strong_match_count: number;
  compared_claim_count: number;
  top_source_claim: string;
  top_peer_claim: string;
  top_similarity: number;
};

function parseEmbeddingVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const nums = raw.map((v) => Number(v));
    if (!nums.length || nums.some((n) => !Number.isFinite(n))) return null;
    return nums;
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    const nums = parsed.map((v) => Number(v));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return nums;
  } catch {
    return null;
  }
}

async function fetchPeerLibraryCount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  artifactId: string,
): Promise<number> {
  const { count } = await supabase
    .from("artifacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ready")
    .neq("id", artifactId);
  return count ?? 0;
}

async function loadPeersViaMatchRpc(
  supabase: ReturnType<typeof createClient>,
  admin: ReturnType<typeof createClient>,
  userId: string,
  artifactId: string,
): Promise<CorpusPeerRow[]> {
  const { data: sourceRows, error: sourceErr } = await admin
    .from("artifact_claims")
    .select("id, claim, artifact_id, embedding")
    .eq("user_id", userId)
    .eq("artifact_id", artifactId)
    .not("embedding", "is", null);

  if (sourceErr || !sourceRows?.length) return [];

  type Hit = {
    peerArtifactId: string;
    sourceClaim: string;
    peerClaim: string;
    similarity: number;
  };

  const hits: Hit[] = [];

  for (const row of sourceRows) {
    const vector = parseEmbeddingVector(row.embedding);
    if (!vector) continue;
    const { data, error } = await supabase.rpc("match_artifact_claims", {
      query_embedding: JSON.stringify(vector),
      match_count: 40,
    });
    if (error) continue;

    const bestByPeer = new Map<string, Hit>();
    for (const match of data ?? []) {
      const peerArtifactId = match.artifact_id as string;
      if (!peerArtifactId || peerArtifactId === artifactId) continue;
      const similarity = Number(match.similarity);
      if (!Number.isFinite(similarity)) continue;
      const hit: Hit = {
        sourceClaim: String(row.claim ?? ""),
        peerArtifactId,
        peerClaim: String(match.claim ?? ""),
        similarity,
      };
      const prev = bestByPeer.get(peerArtifactId);
      if (!prev || similarity > prev.similarity) bestByPeer.set(peerArtifactId, hit);
    }
    hits.push(...bestByPeer.values());
  }

  const byPeer = new Map<
    string,
    { similarities: number[]; strongMatchCount: number; best: Hit }
  >();

  for (const hit of hits) {
    let agg = byPeer.get(hit.peerArtifactId);
    if (!agg) {
      agg = { similarities: [], strongMatchCount: 0, best: hit };
      byPeer.set(hit.peerArtifactId, agg);
    }
    agg.similarities.push(hit.similarity);
    if (hit.similarity >= CORPUS_MIN_SIMILARITY) agg.strongMatchCount += 1;
    if (hit.similarity > agg.best.similarity) agg.best = hit;
  }

  const rows: CorpusPeerRow[] = [];
  for (const [peerArtifactId, agg] of byPeer) {
    const avgSimilarity =
      agg.similarities.reduce((sum, n) => sum + n, 0) / Math.max(1, agg.similarities.length);
    rows.push({
      peer_artifact_id: peerArtifactId,
      avg_similarity: avgSimilarity,
      strong_match_count: agg.strongMatchCount,
      compared_claim_count: agg.similarities.length,
      top_source_claim: agg.best.sourceClaim,
      top_peer_claim: agg.best.peerClaim,
      top_similarity: agg.best.similarity,
    });
  }

  rows.sort((a, b) => {
    if (b.avg_similarity !== a.avg_similarity) return b.avg_similarity - a.avg_similarity;
    return b.strong_match_count - a.strong_match_count;
  });

  return rows.slice(0, CORPUS_MAX_PEERS);
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
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { artifact_id?: string };
    const artifactId = body.artifact_id?.trim();
    if (!artifactId) {
      return new Response(JSON.stringify({ error: "artifact_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: artifact, error: artErr } = await userClient
      .from("artifacts")
      .select("id,status")
      .eq("id", artifactId)
      .eq("user_id", userId)
      .maybeSingle();

    if (artErr || !artifact) {
      return new Response(JSON.stringify({ error: "Artifact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await drainPendingEmbeddingJobs(admin, {
      userId,
      tableName: "artifact_claims",
      limit: 40,
      maxRounds: 6,
    });

    const missingEmbeddings = await countClaimsMissingEmbeddings(admin, userId, artifactId);
    const peerLibraryCount = await fetchPeerLibraryCount(userClient, userId, artifactId);

    let peers: CorpusPeerRow[] = [];
    const corpusRpc = await userClient.rpc("match_corpus_peers_for_artifact", {
      p_artifact_id: artifactId,
      min_similarity: CORPUS_MIN_SIMILARITY,
      match_count: CORPUS_MAX_PEERS,
    });

    if (!corpusRpc.error) {
      peers = (corpusRpc.data ?? []) as CorpusPeerRow[];
    } else {
      peers = await loadPeersViaMatchRpc(userClient, admin, userId, artifactId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        peers,
        peer_library_count: peerLibraryCount,
        embedding_pending: missingEmbeddings > 0,
        error: null,
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
