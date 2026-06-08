import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseCorpusPeerRow,
  parseLibraryCorpusStatRow,
  type CorpusPeerMatch,
  type LibraryCorpusStatRow,
} from "@/lib/framework/artifactCorpusStanding";
import { artifactDisplayTitle } from "@/pages/framework/artifacts/artifactLibraryModel";

export const CORPUS_MIN_SIMILARITY = 0.72;
export const CORPUS_MAX_PEERS = 12;

type ClaimRow = {
  id: string;
  claim: string;
  artifact_id: string;
  embedding: string | null;
  match_relation: string | null;
};

export function parseEmbeddingVector(raw: string | number[] | null | undefined): number[] | null {
  if (Array.isArray(raw)) {
    const nums = raw.map((v) => Number(v));
    if (!nums.length || nums.some((n) => !Number.isFinite(n))) return null;
    return nums;
  }
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const nums = parsed.map((v) => Number(v));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return nums;
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

type ParsedClaim = {
  id: string;
  claim: string;
  artifactId: string;
  vector: number[];
};

function parseClaimRows(rows: ClaimRow[]): ParsedClaim[] {
  const out: ParsedClaim[] = [];
  for (const row of rows) {
    const vector = parseEmbeddingVector(row.embedding);
    if (!vector) continue;
    out.push({
      id: row.id,
      claim: row.claim,
      artifactId: row.artifact_id,
      vector,
    });
  }
  return out;
}

export type CorpusPeerAggregate = Omit<CorpusPeerMatch, "peerTitle" | "peerKind">;

export function computeCorpusPeersFromClaims(
  sourceClaims: ParsedClaim[],
  peerClaims: ParsedClaim[],
  options: { minSimilarity?: number; maxPeers?: number } = {},
): CorpusPeerAggregate[] {
  const minSimilarity = options.minSimilarity ?? CORPUS_MIN_SIMILARITY;
  const maxPeers = options.maxPeers ?? CORPUS_MAX_PEERS;
  if (!sourceClaims.length || !peerClaims.length) return [];

  type BestPair = {
    sourceClaim: string;
    peerClaim: string;
    similarity: number;
  };

  const byPeer = new Map<
    string,
    {
      similarities: number[];
      strongMatchCount: number;
      best: BestPair;
    }
  >();

  for (const source of sourceClaims) {
    const bestByPeer = new Map<string, BestPair>();
    for (const peer of peerClaims) {
      if (peer.artifactId === source.artifactId) continue;
      const similarity = cosineSimilarity(source.vector, peer.vector);
      const prev = bestByPeer.get(peer.artifactId);
      if (!prev || similarity > prev.similarity) {
        bestByPeer.set(peer.artifactId, {
          sourceClaim: source.claim,
          peerClaim: peer.claim,
          similarity,
        });
      }
    }

    for (const [peerArtifactId, pair] of bestByPeer) {
      let agg = byPeer.get(peerArtifactId);
      if (!agg) {
        agg = {
          similarities: [],
          strongMatchCount: 0,
          best: pair,
        };
        byPeer.set(peerArtifactId, agg);
      }
      agg.similarities.push(pair.similarity);
      if (pair.similarity >= minSimilarity) agg.strongMatchCount += 1;
      if (pair.similarity > agg.best.similarity) agg.best = pair;
    }
  }

  const rows: CorpusPeerAggregate[] = [];
  for (const [peerArtifactId, agg] of byPeer) {
    const avgSimilarity =
      agg.similarities.reduce((sum, n) => sum + n, 0) / Math.max(1, agg.similarities.length);
    rows.push({
      peerArtifactId,
      avgSimilarity,
      strongMatchCount: agg.strongMatchCount,
      comparedClaimCount: agg.similarities.length,
      topSourceClaim: agg.best.sourceClaim,
      topPeerClaim: agg.best.peerClaim,
      topSimilarity: agg.best.similarity,
    });
  }

  rows.sort((a, b) => {
    if (b.avgSimilarity !== a.avgSimilarity) return b.avgSimilarity - a.avgSimilarity;
    return b.strongMatchCount - a.strongMatchCount;
  });

  return rows.slice(0, maxPeers);
}

export type CorpusMatchHit = {
  sourceClaim: string;
  peerArtifactId: string;
  peerClaim: string;
  similarity: number;
};

/** Aggregate best source→peer pairs (one similarity per source claim per peer artifact). */
export function aggregateCorpusPeersFromMatches(
  hits: CorpusMatchHit[],
  options: { minSimilarity?: number; maxPeers?: number } = {},
): CorpusPeerAggregate[] {
  const minSimilarity = options.minSimilarity ?? CORPUS_MIN_SIMILARITY;
  const maxPeers = options.maxPeers ?? CORPUS_MAX_PEERS;
  if (!hits.length) return [];

  const byPeer = new Map<
    string,
    {
      similarities: number[];
      strongMatchCount: number;
      best: CorpusMatchHit;
    }
  >();

  for (const hit of hits) {
    let agg = byPeer.get(hit.peerArtifactId);
    if (!agg) {
      agg = {
        similarities: [],
        strongMatchCount: 0,
        best: hit,
      };
      byPeer.set(hit.peerArtifactId, agg);
    }
    agg.similarities.push(hit.similarity);
    if (hit.similarity >= minSimilarity) agg.strongMatchCount += 1;
    if (hit.similarity > agg.best.similarity) agg.best = hit;
  }

  const rows: CorpusPeerAggregate[] = [];
  for (const [peerArtifactId, agg] of byPeer) {
    const avgSimilarity =
      agg.similarities.reduce((sum, n) => sum + n, 0) / Math.max(1, agg.similarities.length);
    rows.push({
      peerArtifactId,
      avgSimilarity,
      strongMatchCount: agg.strongMatchCount,
      comparedClaimCount: agg.similarities.length,
      topSourceClaim: agg.best.sourceClaim,
      topPeerClaim: agg.best.peerClaim,
      topSimilarity: agg.best.similarity,
    });
  }

  rows.sort((a, b) => {
    if (b.avgSimilarity !== a.avgSimilarity) return b.avgSimilarity - a.avgSimilarity;
    return b.strongMatchCount - a.strongMatchCount;
  });

  return rows.slice(0, maxPeers);
}

function embeddingToRpcString(vector: number[]): string {
  return JSON.stringify(vector);
}

async function fetchPeerLibraryCount(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
): Promise<{ count: number; error: string | null }> {
  const countRes = await supabase
    .from("artifacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ready")
    .neq("id", artifactId);
  return {
    count: countRes.count ?? 0,
    error: countRes.error?.message ?? null,
  };
}

/** Fallback: one small source query + per-claim `match_artifact_claims` RPC (no bulk embedding download). */
export async function fetchCorpusPeersViaMatchRpc(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
): Promise<{ peers: CorpusPeerAggregate[]; peerLibraryCount: number; error: string | null }> {
  const { count: peerLibraryCount, error: countError } = await fetchPeerLibraryCount(
    supabase,
    userId,
    artifactId,
  );
  if (countError) return { peers: [], peerLibraryCount: 0, error: countError };

  const sourceRes = await supabase
    .from("artifact_claims")
    .select("id, claim, artifact_id, embedding")
    .eq("user_id", userId)
    .eq("artifact_id", artifactId)
    .not("embedding", "is", null);

  if (sourceRes.error) {
    return { peers: [], peerLibraryCount, error: sourceRes.error.message };
  }

  const sourceClaims = parseClaimRows((sourceRes.data ?? []) as ClaimRow[]);
  if (!sourceClaims.length) {
    return { peers: [], peerLibraryCount, error: null };
  }

  const hits: CorpusMatchHit[] = [];

  for (const source of sourceClaims) {
    const { data, error } = await supabase.rpc("match_artifact_claims", {
      query_embedding: embeddingToRpcString(source.vector),
      match_count: 40,
    });
    if (error) continue;

    const bestByPeer = new Map<string, CorpusMatchHit>();
    for (const row of data ?? []) {
      const peerArtifactId = row.artifact_id as string;
      if (!peerArtifactId || peerArtifactId === artifactId) continue;
      const similarity = Number(row.similarity);
      if (!Number.isFinite(similarity)) continue;
      const prev = bestByPeer.get(peerArtifactId);
      const hit: CorpusMatchHit = {
        sourceClaim: source.claim,
        peerArtifactId,
        peerClaim: String(row.claim ?? ""),
        similarity,
      };
      if (!prev || similarity > prev.similarity) bestByPeer.set(peerArtifactId, hit);
    }
    hits.push(...bestByPeer.values());
  }

  return {
    peers: aggregateCorpusPeersFromMatches(hits),
    peerLibraryCount,
    error: null,
  };
}

export async function fetchCorpusPeersForArtifact(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
): Promise<{ peers: CorpusPeerAggregate[]; peerLibraryCount: number; error: string | null }> {
  const [sourceRes, peerRes, countRes] = await Promise.all([
    supabase
      .from("artifact_claims")
      .select("id, claim, artifact_id, embedding")
      .eq("user_id", userId)
      .eq("artifact_id", artifactId)
      .not("embedding", "is", null),
    supabase
      .from("artifact_claims")
      .select("id, claim, artifact_id, embedding")
      .eq("user_id", userId)
      .neq("artifact_id", artifactId)
      .not("embedding", "is", null),
    supabase
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "ready")
      .neq("id", artifactId),
  ]);

  if (sourceRes.error) return { peers: [], peerLibraryCount: 0, error: sourceRes.error.message };
  if (peerRes.error) return { peers: [], peerLibraryCount: 0, error: peerRes.error.message };

  const sourceClaims = parseClaimRows((sourceRes.data ?? []) as ClaimRow[]);
  const peerClaims = parseClaimRows((peerRes.data ?? []) as ClaimRow[]);
  const peers = computeCorpusPeersFromClaims(sourceClaims, peerClaims);

  return {
    peers,
    peerLibraryCount: countRes.count ?? 0,
    error: null,
  };
}

/** Prefer server edge function (embeds + vector match); fall back to direct RPC. */
export async function loadCorpusPeersForArtifact(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
): Promise<{
  peers: CorpusPeerAggregate[];
  peerLibraryCount: number;
  error: string | null;
  embeddingPending: boolean;
}> {
  try {
    const { data, error: invokeError } = await supabase.functions.invoke("framework-corpus-peers", {
      body: { artifact_id: artifactId },
    });
    if (!invokeError && data && typeof data === "object") {
      const payload = data as {
        error?: string | null;
        peers?: Parameters<typeof parseCorpusPeerRow>[0][];
        peer_library_count?: number;
        embedding_pending?: boolean;
      };
      if (payload.error) {
        return {
          peers: [],
          peerLibraryCount: 0,
          error: payload.error,
          embeddingPending: false,
        };
      }
      return {
        peers: (payload.peers ?? []).map(parseCorpusPeerRow),
        peerLibraryCount: payload.peer_library_count ?? 0,
        error: null,
        embeddingPending: Boolean(payload.embedding_pending),
      };
    }
  } catch {
    // Fall through to direct Supabase RPC when edge function is not deployed yet.
  }

  const rpc = await supabase.rpc("match_corpus_peers_for_artifact", {
    p_artifact_id: artifactId,
    min_similarity: CORPUS_MIN_SIMILARITY,
    match_count: CORPUS_MAX_PEERS,
  });

  if (!rpc.error) {
    const parsed = (rpc.data ?? []).map(parseCorpusPeerRow);
    const { count: peerLibraryCount, error: countError } = await fetchPeerLibraryCount(
      supabase,
      userId,
      artifactId,
    );
    return {
      peers: parsed,
      peerLibraryCount,
      error: countError,
      embeddingPending: false,
    };
  }

  const fallback = await fetchCorpusPeersViaMatchRpc(supabase, userId, artifactId);
  return { ...fallback, embeddingPending: false };
}

export async function fetchLibraryCorpusStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ rows: LibraryCorpusStatRow[]; error: string | null }> {
  const rpc = await supabase.rpc("get_library_corpus_stats");
  if (!rpc.error) {
    return { rows: (rpc.data ?? []).map(parseLibraryCorpusStatRow), error: null };
  }

  const [artifactsRes, claimsRes] = await Promise.all([
    supabase
      .from("artifacts")
      .select("id, title, kind, created_at")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false }),
    supabase.from("artifact_claims").select("artifact_id, match_relation").eq("user_id", userId),
  ]);

  if (artifactsRes.error) return { rows: [], error: artifactsRes.error.message };
  if (claimsRes.error) return { rows: [], error: claimsRes.error.message };

  const ready = artifactsRes.data ?? [];
  const peerLibraryCount = Math.max(0, ready.length - 1);
  const byArtifact = new Map<string, { agree: number; disagree: number; new: number }>();

  for (const c of claimsRes.data ?? []) {
    const id = c.artifact_id as string;
    let bucket = byArtifact.get(id);
    if (!bucket) {
      bucket = { agree: 0, disagree: 0, new: 0 };
      byArtifact.set(id, bucket);
    }
    const rel = c.match_relation as string | null;
    if (rel === "agree") bucket.agree += 1;
    else if (rel === "disagree") bucket.disagree += 1;
    else bucket.new += 1;
  }

  const rows: LibraryCorpusStatRow[] = ready.map((a) => {
    const counts = byArtifact.get(a.id) ?? { agree: 0, disagree: 0, new: 0 };
    const claimCount = counts.agree + counts.disagree + counts.new;
    return {
      artifactId: a.id,
      title: a.title,
      kind: a.kind,
      createdAt: a.created_at,
      claimCount,
      agreeCount: counts.agree,
      disagreeCount: counts.disagree,
      newCount: counts.new,
      peerLibraryCount,
    };
  });

  return { rows, error: null };
}

export async function attachPeerArtifactTitles(
  supabase: SupabaseClient,
  peers: CorpusPeerAggregate[],
): Promise<CorpusPeerMatch[]> {
  const peerIds = peers.map((p) => p.peerArtifactId);
  if (!peerIds.length) return [];

  const { data: arts } = await supabase
    .from("artifacts")
    .select("id,title,kind,metadata,url")
    .in("id", peerIds);

  const titleById = new Map(
    (arts ?? []).map((a) => [a.id, { title: artifactDisplayTitle(a), kind: a.kind }]),
  );

  return peers.map((p) => {
    const meta = titleById.get(p.peerArtifactId);
    return {
      ...p,
      peerTitle: meta?.title ?? null,
      peerKind: meta?.kind ?? null,
    };
  });
}
