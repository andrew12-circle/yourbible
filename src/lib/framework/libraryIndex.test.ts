import { describe, expect, it } from "vitest";
import { classifyLibraryArtifactIssue, libraryIndexNeedsWork } from "@/lib/framework/libraryIndex";

describe("classifyLibraryArtifactIssue", () => {
  it("marks ready artifacts with embeddings as ok", () => {
    expect(
      classifyLibraryArtifactIssue({
        status: "ready",
        claims_total: 3,
        transcript_chunks_total: 12,
        claims_missing_embedding: 0,
        transcript_chunks_missing_embedding: 0,
      }),
    ).toBe("ok");
  });

  it("marks missing embeddings as needs_embedding", () => {
    expect(
      classifyLibraryArtifactIssue({
        status: "ready",
        claims_total: 2,
        transcript_chunks_total: 4,
        claims_missing_embedding: 1,
        transcript_chunks_missing_embedding: 0,
      }),
    ).toBe("needs_embedding");
  });

  it("marks ready artifacts without claims or chunks as needs_analysis", () => {
    expect(
      classifyLibraryArtifactIssue({
        status: "ready",
        claims_total: 0,
        transcript_chunks_total: 0,
        claims_missing_embedding: 0,
        transcript_chunks_missing_embedding: 0,
      }),
    ).toBe("needs_analysis");
  });

  it("marks in-flight statuses as processing", () => {
    expect(
      classifyLibraryArtifactIssue({
        status: "processing",
        claims_total: 0,
        transcript_chunks_total: 0,
        claims_missing_embedding: 0,
        transcript_chunks_missing_embedding: 0,
      }),
    ).toBe("processing");
  });
});

describe("libraryIndexNeedsWork", () => {
  it("returns false when the library is fully indexed", () => {
    expect(
      libraryIndexNeedsWork({
        artifacts_total: 10,
        artifacts_ready: 10,
        artifacts_searchable: 10,
        artifacts_needing_analysis: 0,
        artifacts_needing_embedding: 0,
        claims_total: 20,
        claims_missing_embedding: 0,
        transcript_chunks_total: 100,
        transcript_chunks_missing_embedding: 0,
        embedding_jobs_pending: 0,
        embedding_jobs_error: 0,
      }),
    ).toBe(false);
  });

  it("returns true when embeddings are missing", () => {
    expect(
      libraryIndexNeedsWork({
        artifacts_total: 10,
        artifacts_ready: 10,
        artifacts_searchable: 8,
        artifacts_needing_analysis: 0,
        artifacts_needing_embedding: 2,
        claims_total: 20,
        claims_missing_embedding: 4,
        transcript_chunks_total: 100,
        transcript_chunks_missing_embedding: 0,
        embedding_jobs_pending: 0,
        embedding_jobs_error: 0,
      }),
    ).toBe(true);
  });
});
