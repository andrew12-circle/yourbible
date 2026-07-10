import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type LibraryArtifactIssue =
  | "ok"
  | "processing"
  | "needs_analysis"
  | "needs_embedding";

export type LibraryArtifactIndexRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  claims_total: number;
  claims_missing_embedding: number;
  transcript_chunks_total: number;
  transcript_chunks_missing_embedding: number;
  issue: LibraryArtifactIssue;
};

export type LibraryIndexSummary = {
  artifacts_total: number;
  artifacts_ready: number;
  artifacts_searchable: number;
  artifacts_needing_analysis: number;
  artifacts_needing_embedding: number;
  claims_total: number;
  claims_missing_embedding: number;
  transcript_chunks_total: number;
  transcript_chunks_missing_embedding: number;
  embedding_jobs_pending: number;
  embedding_jobs_error: number;
};

export type LibraryIndexStatus = {
  summary: LibraryIndexSummary;
  issues: LibraryArtifactIndexRow[];
};

export type LibraryReindexResult = {
  enqueued: Record<string, number>;
  drain: { processed: number; succeeded: number; failed: number };
  status: LibraryIndexStatus;
};

/** Classify whether Lumen can semantically search an artifact. */
export function classifyLibraryArtifactIssue(input: {
  status: string;
  claims_total: number;
  transcript_chunks_total: number;
  claims_missing_embedding: number;
  transcript_chunks_missing_embedding: number;
}): LibraryArtifactIssue {
  const st = input.status.trim().toLowerCase();
  if (st && st !== "ready" && st !== "failed") return "processing";
  if (st === "failed") return "needs_analysis";
  const missingEmb =
    input.claims_missing_embedding + input.transcript_chunks_missing_embedding;
  if (missingEmb > 0) return "needs_embedding";
  if (input.claims_total === 0 && input.transcript_chunks_total === 0) {
    return "needs_analysis";
  }
  return "ok";
}

export const LIBRARY_ISSUE_LABELS: Record<LibraryArtifactIssue, string> = {
  ok: "Searchable",
  processing: "Processing",
  needs_analysis: "Needs analysis",
  needs_embedding: "Needs indexing",
};

export function libraryIndexNeedsWork(summary: LibraryIndexSummary): boolean {
  return (
    summary.artifacts_needing_analysis > 0 ||
    summary.artifacts_needing_embedding > 0 ||
    summary.embedding_jobs_pending > 0 ||
    summary.embedding_jobs_error > 0
  );
}

async function invokeLibraryIndex<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(
    "framework-library-index",
    { body },
  );
  if (error) throw new Error(await edgeFunctionErrorMessage("framework-library-index", error, data));
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    throw new Error(data.error);
  }
  return data as T;
}

export async function fetchLibraryIndexStatus(): Promise<LibraryIndexStatus> {
  const data = await invokeLibraryIndex<{ ok: true } & LibraryIndexStatus>({ mode: "status" });
  return { summary: data.summary, issues: data.issues };
}

export async function reindexLibrary(options?: {
  drainLimit?: number;
  drainRounds?: number;
}): Promise<LibraryReindexResult> {
  const data = await invokeLibraryIndex<{ ok: true } & LibraryReindexResult>({
    mode: "reindex",
    drain_limit: options?.drainLimit,
    drain_rounds: options?.drainRounds,
  });
  return {
    enqueued: data.enqueued,
    drain: data.drain,
    status: data.status,
  };
}
