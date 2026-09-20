/** Resume checkpoints only when they belong to this exact source version. */
export async function canResumeArtifactAnalysis(source: string, analysis: unknown): Promise<boolean> {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return false;
  const row = analysis as Record<string, unknown>;
  if (!["queued", "running", "partial", "failed"].includes(String(row.state))) return false;
  if (typeof row.transcript_hash !== "string" || !/^[a-f0-9]{64}$/.test(row.transcript_hash)) return false;
  if (!globalThis.crypto?.subtle) return false;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  return hash === row.transcript_hash;
}
