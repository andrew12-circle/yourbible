/** Recover artifacts stuck in error after AI rate limits when study content remains. */

export function isArtifactRateLimitError(error: string | null | undefined): boolean {
  if (!error?.trim()) return false;
  return /rate limit|provider limit|resource_exhausted/i.test(error);
}

/** Transcript/chapters remain usable even when claim extraction failed. */
export function artifactHasStudyableTranscript(rawText: string | null | undefined): boolean {
  return (rawText?.trim().length ?? 0) >= 2000;
}

export function shouldRepairRateLimitArtifact(options: {
  status: string;
  error: string | null | undefined;
  rawText: string | null | undefined;
}): boolean {
  if (options.status !== "error") return false;
  if (!isArtifactRateLimitError(options.error)) return false;
  return artifactHasStudyableTranscript(options.rawText);
}

/** Non-blocking rate-limit note — transcript/chapters/claims still usable. */
export function isNonBlockingAnalysisError(options: {
  error: string | null | undefined;
  rawText: string | null | undefined;
  claimsCount: number;
}): boolean {
  if (!isArtifactRateLimitError(options.error)) return false;
  if (options.claimsCount > 0) return true;
  return artifactHasStudyableTranscript(options.rawText);
}
