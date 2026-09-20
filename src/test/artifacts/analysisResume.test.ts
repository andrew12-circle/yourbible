import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canResumeArtifactAnalysis } from "@/lib/framework/artifactAnalysisResume";
const source = "An exact source snapshot.";
const hash = async (text: string) => Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2, "0")).join("");
beforeEach(() => vi.stubGlobal("crypto", webcrypto));
afterEach(() => vi.unstubAllGlobals());
describe("analysis checkpoint identity", () => {
  it("resumes a partial run only for the exact same source", async () => {
    const analysis = { state: "partial", transcript_hash: await hash(source) };
    expect(await canResumeArtifactAnalysis(source, analysis)).toBe(true);
    expect(await canResumeArtifactAnalysis("An edited source snapshot.", analysis)).toBe(false);
  });
  it("starts a new run for completed, stale or superseded analysis", async () => {
    for (const state of ["complete", "stale", "superseded"]) {
      expect(await canResumeArtifactAnalysis(source, { state, transcript_hash: await hash(source) })).toBe(false);
    }
  });
  it("does not guess identity when source metadata or hashing is unavailable", async () => {
    expect(await canResumeArtifactAnalysis(source, { state: "partial" })).toBe(false);
    expect(await canResumeArtifactAnalysis(source, null)).toBe(false);
    vi.stubGlobal("crypto", {});
    expect(await canResumeArtifactAnalysis(source, { state: "partial", transcript_hash: await hash(source) })).toBe(false);
  });
});
