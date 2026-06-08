import { describe, expect, it } from "vitest";
import {
  aggregateCorpusPeersFromMatches,
  computeCorpusPeersFromClaims,
  cosineSimilarity,
  parseEmbeddingVector,
} from "./fetchCorpusStanding";

describe("parseEmbeddingVector", () => {
  it("parses pgvector json string", () => {
    expect(parseEmbeddingVector("[1,0,0]")).toEqual([1, 0, 0]);
  });

  it("parses numeric arrays", () => {
    expect(parseEmbeddingVector([0.5, 0.5, 0])).toEqual([0.5, 0.5, 0]);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });
});

describe("computeCorpusPeersFromClaims", () => {
  it("groups best matches per peer artifact", () => {
    const source = [
      { id: "s1", claim: "Source A", artifactId: "a", vector: [1, 0, 0] },
      { id: "s2", claim: "Source B", artifactId: "a", vector: [0, 1, 0] },
    ];
    const peers = [
      { id: "p1", claim: "Peer A", artifactId: "b", vector: [1, 0, 0] },
      { id: "p2", claim: "Peer B", artifactId: "c", vector: [0, 1, 0] },
    ];
    const rows = computeCorpusPeersFromClaims(source, peers, { minSimilarity: 0.9 });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.strongMatchCount).toBeGreaterThanOrEqual(1);
  });
});

describe("aggregateCorpusPeersFromMatches", () => {
  it("aggregates rpc match hits per peer artifact", () => {
    const rows = aggregateCorpusPeersFromMatches(
      [
        {
          sourceClaim: "Source A",
          peerArtifactId: "b",
          peerClaim: "Peer A",
          similarity: 0.91,
        },
        {
          sourceClaim: "Source B",
          peerArtifactId: "b",
          peerClaim: "Peer B",
          similarity: 0.75,
        },
      ],
      { minSimilarity: 0.72 },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.peerArtifactId).toBe("b");
    expect(rows[0]?.strongMatchCount).toBe(2);
    expect(rows[0]?.comparedClaimCount).toBe(2);
  });
});
