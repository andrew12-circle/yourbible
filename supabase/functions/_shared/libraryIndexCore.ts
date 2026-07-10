import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { drainPendingEmbeddingJobs } from "./embeddingJobDrain.ts";

const LIBRARY_TABLES = ["artifact_claims", "artifact_transcript_chunks"] as const;

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

function artifactTitle(row: { title?: string | null; kind?: string | null }): string {
  const t = typeof row.title === "string" ? row.title.trim() : "";
  if (t) return t.slice(0, 120);
  if (row.kind === "youtube") return "YouTube video";
  if (row.kind === "podcast") return "Podcast";
  if (row.kind === "pdf") return "PDF document";
  return "Untitled artifact";
}

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

function bumpCount(map: Map<string, number>, id: string, n = 1) {
  map.set(id, (map.get(id) ?? 0) + n);
}

export async function auditLibraryIndex(
  admin: SupabaseClient,
  userId: string,
  issueLimit = 48,
): Promise<LibraryIndexStatus> {
  const { data: artifacts, error: artErr } = await admin
    .from("artifacts")
    .select("id, title, kind, status")
    .eq("user_id", userId)
    .neq("status", "failed")
    .order("created_at", { ascending: false });
  if (artErr) throw new Error(artErr.message);

  const artifactRows = (artifacts ?? []) as {
    id: string;
    title: string | null;
    kind: string | null;
    status: string | null;
  }[];

  const claimsTotal = new Map<string, number>();
  const claimsMissing = new Map<string, number>();
  const chunksTotal = new Map<string, number>();
  const chunksMissing = new Map<string, number>();

  const { data: claimRows, error: claimErr } = await admin
    .from("artifact_claims")
    .select("artifact_id, embedding")
    .eq("user_id", userId);
  if (claimErr) throw new Error(claimErr.message);
  for (const row of claimRows ?? []) {
    const id = row.artifact_id as string;
    bumpCount(claimsTotal, id);
    if (row.embedding == null) bumpCount(claimsMissing, id);
  }

  const { data: chunkRows, error: chunkErr } = await admin
    .from("artifact_transcript_chunks")
    .select("artifact_id, embedding")
    .eq("user_id", userId);
  if (chunkErr) throw new Error(chunkErr.message);
  for (const row of chunkRows ?? []) {
    const id = row.artifact_id as string;
    bumpCount(chunksTotal, id);
    if (row.embedding == null) bumpCount(chunksMissing, id);
  }

  let pendingJobs = 0;
  let errorJobs = 0;
  for (const table of LIBRARY_TABLES) {
    const { count: pCount } = await admin
      .from("embedding_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("table_name", table)
      .eq("status", "pending");
    pendingJobs += pCount ?? 0;

    const { count: eCount } = await admin
      .from("embedding_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("table_name", table)
      .eq("status", "error");
    errorJobs += eCount ?? 0;
  }

  const indexRows: LibraryArtifactIndexRow[] = artifactRows.map((a) => {
    const status = typeof a.status === "string" ? a.status : "";
    const claims_total = claimsTotal.get(a.id) ?? 0;
    const claims_missing_embedding = claimsMissing.get(a.id) ?? 0;
    const transcript_chunks_total = chunksTotal.get(a.id) ?? 0;
    const transcript_chunks_missing_embedding = chunksMissing.get(a.id) ?? 0;
    return {
      id: a.id,
      title: artifactTitle(a),
      kind: typeof a.kind === "string" ? a.kind : "artifact",
      status,
      claims_total,
      claims_missing_embedding,
      transcript_chunks_total,
      transcript_chunks_missing_embedding,
      issue: classifyLibraryArtifactIssue({
        status,
        claims_total,
        transcript_chunks_total,
        claims_missing_embedding,
        transcript_chunks_missing_embedding,
      }),
    };
  });

  const issues = indexRows.filter((r) => r.issue !== "ok").slice(0, issueLimit);

  let claims_total = 0;
  let claims_missing_embedding = 0;
  let transcript_chunks_total = 0;
  let transcript_chunks_missing_embedding = 0;
  for (const r of indexRows) {
    claims_total += r.claims_total;
    claims_missing_embedding += r.claims_missing_embedding;
    transcript_chunks_total += r.transcript_chunks_total;
    transcript_chunks_missing_embedding += r.transcript_chunks_missing_embedding;
  }

  const summary: LibraryIndexSummary = {
    artifacts_total: indexRows.length,
    artifacts_ready: indexRows.filter((r) => r.status === "ready").length,
    artifacts_searchable: indexRows.filter((r) => r.issue === "ok").length,
    artifacts_needing_analysis: indexRows.filter((r) => r.issue === "needs_analysis").length,
    artifacts_needing_embedding: indexRows.filter((r) => r.issue === "needs_embedding").length,
    claims_total,
    claims_missing_embedding,
    transcript_chunks_total,
    transcript_chunks_missing_embedding,
    embedding_jobs_pending: pendingJobs,
    embedding_jobs_error: errorJobs,
  };

  return { summary, issues };
}

async function enqueueMissingLibraryEmbeddings(
  admin: SupabaseClient,
  userId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of LIBRARY_TABLES) {
    const { data, error } = await admin
      .from(table)
      .select("id, user_id")
      .eq("user_id", userId)
      .is("embedding", null)
      .limit(4000);
    if (error) throw new Error(`${table}: ${error.message}`);
    let n = 0;
    for (const r of (data ?? []) as { id: string; user_id: string }[]) {
      const { error: insErr } = await admin.from("embedding_jobs").insert({
        user_id: r.user_id,
        table_name: table,
        row_id: r.id,
        status: "pending",
      });
      if (!insErr) n += 1;
    }
    counts[table] = n;
  }
  return counts;
}

export type LibraryReindexResult = {
  enqueued: Record<string, number>;
  drain: { processed: number; succeeded: number; failed: number };
  status: LibraryIndexStatus;
};

export async function reindexLibraryForUser(
  admin: SupabaseClient,
  userId: string,
  drainLimit = 30,
  drainRounds = 6,
): Promise<LibraryReindexResult> {
  const enqueued = await enqueueMissingLibraryEmbeddings(admin, userId);
  const drain = await drainPendingEmbeddingJobs(admin, {
    userId,
    limit: drainLimit,
    maxRounds: drainRounds,
  });
  const status = await auditLibraryIndex(admin, userId);
  return { enqueued, drain, status };
}
