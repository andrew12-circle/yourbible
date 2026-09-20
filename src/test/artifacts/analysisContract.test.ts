import { describe, it, expect } from "vitest";
import { planArtifactAnalysis, validateCandidates, parseRankedFindings, deduplicateCandidates, type AnalysisBatch } from "../../../supabase/functions/_shared/artifactAnalysisContract";
import { classifyAnalysisFailure } from "../../../supabase/functions/_shared/artifactAnalysisErrors";
const batch: AnalysisBatch = { index: 0, segments: [
  { id: "transcript-0", text: "The speaker describes a personal experience of learning patience.", startSeconds: 10, endSeconds: 15, timing: "measured" },
  { id: "transcript-1", text: "This is an example, not a rule for every person.", startSeconds: 15, endSeconds: 20, timing: "measured" },
] };
const finding = { claim: "The speaker reports learning patience through a personal experience, not a universal rule.",
  quote: batch.segments.map(s => s.text).join(" "), source_segment_ids: batch.segments.map(s => s.id),
  claim_type: "testimony", importance_score: 72, importance_reason: "Qualifies the central example.", doctrine_tags: ["patience"], scriptures_cited: [] };
describe("complete transcript coverage", () => {
  it("covers all of a three-hour timed transcript without a ninety-minute cutoff", () => {
    const raw = Array.from({ length: 181 }, (_, i) => `[${Math.floor(i / 60)}:${String(i % 60).padStart(2, "0")}:00] ${`section ${i} evidence `.repeat(90)}`).join("\n");
    const batches = planArtifactAnalysis(raw);
    expect(batches.length).toBeGreaterThan(10);
    const rows = batches.flatMap(b => b.segments);
    expect(rows.at(-1)?.startSeconds).toBe(10800);
    expect(rows.at(-1)?.text).toContain("section 180 evidence");
    expect(new Set(rows.map(r => r.id)).size).toBe(rows.length);
  });
  it("retains the entire tail of large untimed text", () => {
    const raw = "untimed source words ".repeat(10000) + "IMPORTANT LAST SENTENCE";
    const rebuilt = planArtifactAnalysis(raw).flatMap(b => b.segments).map(s => s.text).join(" ");
    expect(rebuilt).toBe(raw.trim()); expect(rebuilt.endsWith("IMPORTANT LAST SENTENCE")).toBe(true);
  });
  it("rejects oversized input explicitly instead of clipping it", () => {
    expect(() => planArtifactAnalysis("x".repeat(2_000_001))).toThrow("exceeds");
    expect(() => planArtifactAnalysis(" ")).toThrow("empty");
  });
});
describe("source-grounded findings", () => {
  it("stores actual supporting range and quotation", () => {
    const [result] = validateCandidates({ claims: [finding] }, batch);
    expect(result.source_start_seconds).toBe(10); expect(result.source_quote).toBe(finding.quote);
    expect(result.source_segment_ids).toEqual(["transcript-0", "transcript-1"]);
  });
  it("accepts zero findings without padding a quota", () => expect(validateCandidates({ claims: [] }, batch)).toEqual([]));
  it("rejects invented quotations", () => expect(() => validateCandidates({ claims: [{ ...finding, quote: "Everyone must always reveal their shame." }] }, batch)).toThrow("does not match"));
  it("rejects unknown and repeated segment IDs", () => {
    for (const ids of [["unknown"], ["transcript-1", "transcript-0"], ["transcript-0", "transcript-0"]]) {
      expect(() => validateCandidates({ claims: [{ ...finding, source_segment_ids: ids }] }, batch)).toThrow("source range");
    }
  });
  it("rejects missing schema fields and invented confidence types", () => {
    expect(() => validateCandidates({ claims: [{ ...finding, claim_type: "certainly_true" }] }, batch)).toThrow("type");
    expect(() => validateCandidates({ claims: [{ ...finding, importance_score: "high" }] }, batch)).toThrow("score");
    expect(() => validateCandidates({}, batch)).toThrow("claims array");
  });
  it("does not turn an AI-suggested Bible verse into a source citation", () => {
    expect(validateCandidates({ claims: [{ ...finding, scriptures_cited: ["John 3:16"] }] }, batch)[0].scripture_supports).toEqual([]);
  });
});
describe("whole-source consolidation", () => {
  const candidates = validateCandidates({ claims: [finding] }, batch);
  it("keeps selected evidence immutable and rejects made-up belief IDs", () => {
    const output = parseRankedFindings({ summary: "The speaker describes an example.", findings: [{ candidate_id: candidates[0].id, importance_reason: "Central qualification.", matched_belief_id: "invented", match_relation: "agree" }] }, candidates, new Set());
    expect(output.findings[0].source_quote).toBe(finding.quote); expect(output.findings[0].matched_belief_id).toBeNull();
    expect(output.findings[0].match_relation).toBe("new"); expect(output.findings[0].is_primary).toBe(true);
  });
  it("rejects unknown IDs and unexplained empty results", () => {
    expect(() => parseRankedFindings({ summary: "Summary", findings: [{ candidate_id: "invented" }] }, candidates, new Set())).toThrow("unknown");
    expect(() => parseRankedFindings({ summary: "Summary", findings: [] }, candidates, new Set())).toThrow("without an explanation");
  });
  it("deduplicates identical statements without losing the best supporting candidate", () => {
    expect(deduplicateCandidates([...candidates, { ...candidates[0], id: "b1c0", importance_score: 90 }])).toHaveLength(1);
  });
  it("distinguishes billing from temporary rate limiting", () => {
    expect(classifyAnalysisFailure(429, "insufficient_quota", "openai").retryable).toBe(false);
    expect(classifyAnalysisFailure(429, "requests per minute", "openai").retryable).toBe(true);
    expect(classifyAnalysisFailure(401, "invalid key", "openai").message).not.toContain("Lovable");
  });
});
