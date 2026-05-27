/** Fields sent to `my-ai-chat` so the model keeps artifact transcript + claim verdicts in scope. */
export type MyAiArtifactContextBody = {
  context_artifact_id?: string;
  context_artifact_claim_id?: string;
  context_transcript_excerpt?: string | null;
};

export function myAiArtifactContextBody(params: {
  artifactId: string;
  claimId?: string | null;
  transcriptExcerpt?: string | null;
}): MyAiArtifactContextBody {
  const body: MyAiArtifactContextBody = { context_artifact_id: params.artifactId };
  if (params.claimId) body.context_artifact_claim_id = params.claimId;
  const ex = params.transcriptExcerpt?.trim();
  if (ex) body.context_transcript_excerpt = ex.slice(0, 4000);
  return body;
}
