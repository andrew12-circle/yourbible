export type CorpusPeerMatch = {
  peerArtifactId: string;
  avgSimilarity: number;
  strongMatchCount: number;
  comparedClaimCount: number;
  topSourceClaim: string;
  topPeerClaim: string;
  topSimilarity: number;
  peerTitle: string | null;
  peerKind: string | null;
};

export type LibraryCorpusStatRow = {
  artifactId: string;
  title: string | null;
  kind: string;
  createdAt: string;
  claimCount: number;
  agreeCount: number;
  disagreeCount: number;
  newCount: number;
  peerLibraryCount: number;
};

export type BeliefAlignmentBreakdown = {
  agree: number;
  disagree: number;
  new: number;
  total: number;
  agreePct: number;
  disagreePct: number;
  newPct: number;
};

export function beliefAlignmentFromCounts(
  agree: number,
  disagree: number,
  newCount: number,
): BeliefAlignmentBreakdown {
  const total = agree + disagree + newCount;
  if (total <= 0) {
    return { agree: 0, disagree: 0, new: newCount, total: 0, agreePct: 0, disagreePct: 0, newPct: 0 };
  }
  return {
    agree,
    disagree,
    new: newCount,
    total,
    agreePct: Math.round((agree / total) * 100),
    disagreePct: Math.round((disagree / total) * 100),
    newPct: Math.round((newCount / total) * 100),
  };
}

export function formatSimilarityPct(similarity: number): string {
  return `${Math.round(Math.max(0, Math.min(1, similarity)) * 100)}%`;
}

export function corpusResonanceLabel(avgSimilarity: number): string {
  if (avgSimilarity >= 0.88) return "Very similar";
  if (avgSimilarity >= 0.78) return "Similar themes";
  if (avgSimilarity >= 0.68) return "Some overlap";
  return "Loosely related";
}

export function parseCorpusPeerRow(row: {
  peer_artifact_id: string;
  avg_similarity: number;
  strong_match_count: number;
  compared_claim_count: number;
  top_source_claim: string;
  top_peer_claim: string;
  top_similarity: number;
}): Omit<CorpusPeerMatch, "peerTitle" | "peerKind"> {
  return {
    peerArtifactId: row.peer_artifact_id,
    avgSimilarity: row.avg_similarity,
    strongMatchCount: Number(row.strong_match_count),
    comparedClaimCount: Number(row.compared_claim_count),
    topSourceClaim: row.top_source_claim,
    topPeerClaim: row.top_peer_claim,
    topSimilarity: row.top_similarity,
  };
}

export function parseLibraryCorpusStatRow(row: {
  artifact_id: string;
  title: string | null;
  kind: string;
  created_at: string;
  claim_count: number;
  agree_count: number;
  disagree_count: number;
  new_count: number;
  peer_library_count: number;
}): LibraryCorpusStatRow {
  return {
    artifactId: row.artifact_id,
    title: row.title,
    kind: row.kind,
    createdAt: row.created_at,
    claimCount: Number(row.claim_count),
    agreeCount: Number(row.agree_count),
    disagreeCount: Number(row.disagree_count),
    newCount: Number(row.new_count),
    peerLibraryCount: Number(row.peer_library_count),
  };
}

export function summarizeCorpusPeers(
  peers: CorpusPeerMatch[],
  sourceClaimCount: number,
): {
  echoClaimCount: number;
  peerCount: number;
  topPeer: CorpusPeerMatch | null;
} {
  const echoClaimCount = peers.reduce((sum, p) => sum + p.strongMatchCount, 0);
  const cappedEcho = sourceClaimCount > 0 ? Math.min(echoClaimCount, sourceClaimCount) : echoClaimCount;
  return {
    echoClaimCount: cappedEcho,
    peerCount: peers.length,
    topPeer: peers[0] ?? null,
  };
}

/** Only poll while claim embeddings are still indexing — not when zero echoes is a stable result. */
export function shouldScheduleCorpusStandingRetry(
  state: {
    loading: boolean;
    error: string | null;
    embeddingPending: boolean;
  },
  sourceClaimCount: number,
): boolean {
  if (state.loading || state.error) return false;
  if (sourceClaimCount <= 0) return false;
  return state.embeddingPending;
}
