import { describe, expect, it } from "vitest";
import {
  beliefAlignmentFromCounts,
  corpusResonanceLabel,
  formatSimilarityPct,
  parseCorpusPeerRow,
  parseLibraryCorpusStatRow,
  summarizeCorpusPeers,
} from "./artifactCorpusStanding";

describe("beliefAlignmentFromCounts", () => {
  it("computes percentages from claim counts", () => {
    const b = beliefAlignmentFromCounts(6, 2, 2);
    expect(b.total).toBe(10);
    expect(b.agreePct).toBe(60);
    expect(b.disagreePct).toBe(20);
    expect(b.newPct).toBe(20);
  });

  it("handles zero claims", () => {
    const b = beliefAlignmentFromCounts(0, 0, 0);
    expect(b.total).toBe(0);
    expect(b.agreePct).toBe(0);
  });
});

describe("formatSimilarityPct", () => {
  it("clamps and rounds", () => {
    expect(formatSimilarityPct(0.856)).toBe("86%");
    expect(formatSimilarityPct(1.2)).toBe("100%");
  });
});

describe("corpusResonanceLabel", () => {
  it("maps similarity bands", () => {
    expect(corpusResonanceLabel(0.9)).toBe("Very similar");
    expect(corpusResonanceLabel(0.8)).toBe("Similar themes");
    expect(corpusResonanceLabel(0.7)).toBe("Some overlap");
    expect(corpusResonanceLabel(0.5)).toBe("Loosely related");
  });
});

describe("parseCorpusPeerRow", () => {
  it("normalizes rpc row", () => {
    const p = parseCorpusPeerRow({
      peer_artifact_id: "a",
      avg_similarity: 0.81,
      strong_match_count: 3,
      compared_claim_count: 8,
      top_source_claim: "Source claim",
      top_peer_claim: "Peer claim",
      top_similarity: 0.91,
    });
    expect(p.peerArtifactId).toBe("a");
    expect(p.strongMatchCount).toBe(3);
  });
});

describe("parseLibraryCorpusStatRow", () => {
  it("normalizes library stats row", () => {
    const r = parseLibraryCorpusStatRow({
      artifact_id: "x",
      title: "Sermon",
      kind: "youtube",
      created_at: "2026-01-01T00:00:00Z",
      claim_count: 10,
      agree_count: 4,
      disagree_count: 2,
      new_count: 4,
      peer_library_count: 5,
    });
    expect(r.claimCount).toBe(10);
    expect(r.peerLibraryCount).toBe(5);
  });
});

describe("summarizeCorpusPeers", () => {
  it("aggregates echo counts", () => {
    const peers = [
      {
        peerArtifactId: "b",
        avgSimilarity: 0.8,
        strongMatchCount: 2,
        comparedClaimCount: 5,
        topSourceClaim: "a",
        topPeerClaim: "b",
        topSimilarity: 0.85,
        peerTitle: "Other",
        peerKind: "youtube",
      },
    ];
    const s = summarizeCorpusPeers(peers, 6);
    expect(s.echoClaimCount).toBe(2);
    expect(s.peerCount).toBe(1);
    expect(s.topPeer?.peerArtifactId).toBe("b");
  });
});
