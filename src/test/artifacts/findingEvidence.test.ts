import { describe, it, expect } from "vitest";
import { resolveFindingEvidence, principalFindings } from "@/lib/framework/artifactFindingEvidence";
import { reconcileArtifactClaims } from "@/lib/framework/reconcileArtifactClaims";
import { normalizeArtifactClaimArrays } from "@/lib/framework/normalizeArtifactClaim";
const segments = [
  { id: "transcript-0", label: "0:10", text: "An example of patience.", startSeconds: 10 },
  { id: "transcript-1", label: "0:15", text: "Not a universal rule.", startSeconds: 15 },
];
const evidence = { source_quote: "An example of patience. Not a universal rule.", source_segment_ids: ["transcript-0", "transcript-1"], source_timing_kind: "measured" as const };
describe("finding evidence display", () => {
  it("resolves stored consecutive segments rather than similar keywords", () => {
    expect(resolveFindingEvidence(evidence, segments)?.text).toBe(evidence.source_quote);
    expect(resolveFindingEvidence({ source_quote: "patience universal example", source_segment_ids: ["transcript-0"] }, segments)).toBeNull();
  });
  it("does not pretend legacy findings have verified sources", () => expect(resolveFindingEvidence({}, segments)).toBeNull());
  it("invalidates evidence after a source correction", () => {
    expect(resolveFindingEvidence(evidence, [{ ...segments[0], text: "A different statement." }, segments[1]])).toBeNull();
  });
  it("preserves untimed/estimated labels", () => {
    expect(resolveFindingEvidence({ ...evidence, source_timing_kind: "unavailable" }, segments)?.startSeconds).toBeNull();
    expect(resolveFindingEvidence({ ...evidence, source_timing_kind: "estimated" }, segments)?.timestampEstimated).toBe(true);
  });
  it("shows ranked principals without discarding all-findings data", () => {
    const claims = Array.from({ length: 20 }, (_, i) => ({ id: String(i), is_primary: i < 5, importance_score: 100 - i }));
    expect(principalFindings(claims)).toHaveLength(5); expect(claims).toHaveLength(20);
  });
  it("accepts legacy reference/relevance keys", () => {
    expect(normalizeArtifactClaimArrays({ scripture_supports: [{ reference: "John 3:16", relevance: "Source citation" }] }).scripture_supports).toEqual([{ ref: "John 3:16", note: "Source citation" }]);
  });
});
describe("stable card reconciliation", () => {
  const original = [{ id: "1", verdict: null, source_quote: "The source." }];
  it("preserves identical lists", () => expect(reconcileArtifactClaims(original, structuredClone(original))).toBe(original));
  it("updates same-ID findings when fields change", () => {
    const incoming = [{ ...original[0], verdict: "keep" }];
    expect(reconcileArtifactClaims(original, incoming)).toEqual(incoming); expect(reconcileArtifactClaims(original, incoming)).not.toBe(original);
  });
});
