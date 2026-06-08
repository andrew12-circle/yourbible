import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { embedDocument } from "./aiProvider.ts";

const EMBEDDING_DIMS = 768;
const MAX_TEXT_CHARS = 8000;
const MAX_ATTEMPTS = 3;

export type EmbeddingTableName =
  | "belief_nodes"
  | "journal_entries"
  | "artifact_claims"
  | "knowledge_entities"
  | "my_ai_messages"
  | "artifact_transcript_chunks";

const TABLES: EmbeddingTableName[] = [
  "belief_nodes",
  "journal_entries",
  "artifact_claims",
  "knowledge_entities",
  "my_ai_messages",
  "artifact_transcript_chunks",
];

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function composeText(table: EmbeddingTableName, row: Record<string, unknown>): string | null {
  switch (table) {
    case "belief_nodes": {
      const topic = String(row.topic ?? "").trim();
      const statement = String(row.statement ?? "").trim();
      const answer = String(row.answer ?? "").trim();
      const notes = String(row.notes ?? "").trim();
      const parts = [
        topic && `Topic: ${topic}`,
        statement && `Belief: ${statement}`,
        answer && `Answer: ${answer}`,
        notes && `Notes: ${notes}`,
      ].filter(Boolean);
      return parts.length ? parts.join("\n") : null;
    }
    case "journal_entries": {
      if (String(row.entry_kind ?? "") === "vent") return null;
      const title = String(row.title ?? "").trim();
      const summary = String(row.summary ?? "").trim();
      const body = String(row.body ?? "").trim();
      const text = summary || body;
      if (!text && !title) return null;
      return [title && `Title: ${title}`, text].filter(Boolean).join("\n");
    }
    case "artifact_claims": {
      const claim = String(row.claim ?? "").trim();
      const verdict = String(row.verdict ?? "").trim();
      if (!claim) return null;
      return verdict ? `Claim: ${claim}\nVerdict: ${verdict}` : claim;
    }
    case "knowledge_entities": {
      const title = String(row.title ?? "").trim();
      const subtitle = String(row.subtitle ?? "").trim();
      const kind = String(row.kind ?? "").trim();
      if (!title) return null;
      return [kind && `(${kind})`, title, subtitle && `— ${subtitle}`].filter(Boolean).join(" ");
    }
    case "my_ai_messages": {
      if (String(row.role ?? "") !== "assistant") return null;
      const content = String(row.content ?? "").trim();
      return content || null;
    }
    case "artifact_transcript_chunks": {
      const text = String(row.text ?? "").trim();
      return text || null;
    }
  }
}

async function embedOne(text: string): Promise<number[]> {
  const vec = await embedDocument(truncate(text, MAX_TEXT_CHARS));
  if (!vec || vec.length !== EMBEDDING_DIMS) {
    throw new Error("Embedding failed or wrong dimensions");
  }
  return vec;
}

function vecToLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function processJob(
  admin: SupabaseClient,
  job: { id: string; user_id: string; table_name: string; row_id: string; attempts: number },
): Promise<{ ok: boolean; error?: string }> {
  const table = job.table_name as EmbeddingTableName;
  if (!TABLES.includes(table)) {
    await admin.from("embedding_jobs").update({
      status: "error",
      error: "unknown table",
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: false, error: "unknown table" };
  }

  const { error: claimErr } = await admin
    .from("embedding_jobs")
    .update({ status: "processing", attempts: job.attempts + 1 })
    .eq("id", job.id)
    .eq("status", "pending");
  if (claimErr) return { ok: false, error: claimErr.message };

  const { data: row, error: rowErr } = await admin
    .from(table)
    .select("*")
    .eq("id", job.row_id)
    .maybeSingle();

  if (rowErr) {
    await admin.from("embedding_jobs").update({
      status: "error",
      error: rowErr.message,
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: false, error: rowErr.message };
  }
  if (!row) {
    await admin.from("embedding_jobs").update({
      status: "done",
      error: "row missing",
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: true };
  }

  const text = composeText(table, row as Record<string, unknown>);
  if (!text) {
    await admin.from(table).update({ embedding: null }).eq("id", job.row_id);
    await admin.from("embedding_jobs").update({
      status: "done",
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: true };
  }

  try {
    const vec = await embedOne(text);
    const { error: upErr } = await admin.from(table).update({ embedding: vecToLiteral(vec) }).eq("id", job.row_id);
    if (upErr) throw new Error(upErr.message);
    await admin.from("embedding_jobs").update({
      status: "done",
      processed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const willRetry = job.attempts + 1 < MAX_ATTEMPTS;
    await admin.from("embedding_jobs").update({
      status: willRetry ? "pending" : "error",
      error: msg.slice(0, 500),
      processed_at: willRetry ? null : new Date().toISOString(),
    }).eq("id", job.id);
    return { ok: false, error: msg };
  }
}

export type DrainEmbeddingJobsOptions = {
  limit?: number;
  maxRounds?: number;
  userId?: string;
  tableName?: EmbeddingTableName;
};

/** Process pending embedding jobs (newest user-scoped batches first when filtered). */
export async function drainPendingEmbeddingJobs(
  admin: SupabaseClient,
  options: DrainEmbeddingJobsOptions = {},
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const limit = Math.max(1, Math.min(50, options.limit ?? 25));
  const maxRounds = Math.max(1, Math.min(20, options.maxRounds ?? 8));
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let round = 0; round < maxRounds; round += 1) {
    let q = admin
      .from("embedding_jobs")
      .select("id,user_id,table_name,row_id,attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (options.userId) q = q.eq("user_id", options.userId);
    if (options.tableName) q = q.eq("table_name", options.tableName);

    const { data: jobs, error } = await q;
    if (error || !jobs?.length) break;

    for (const job of jobs as {
      id: string;
      user_id: string;
      table_name: string;
      row_id: string;
      attempts: number;
    }[]) {
      const result = await processJob(admin, job);
      processed += 1;
      if (result.ok) succeeded += 1;
      else failed += 1;
    }
  }

  return { processed, succeeded, failed };
}

export async function countClaimsMissingEmbeddings(
  admin: SupabaseClient,
  userId: string,
  artifactId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("artifact_claims")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("artifact_id", artifactId)
    .is("embedding", null);
  if (error) return 0;
  return count ?? 0;
}
