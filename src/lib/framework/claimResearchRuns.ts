import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatResearchPackMarkdown,
  getResearchPackLensOrder,
  sanitizeResearchSectionBody,
  type ResearchPackResp,
} from "@/lib/framework/claimResearchPack";

export type ClaimResearchRunRow = {
  id: string;
  created_at: string;
  user_id: string;
  artifact_claim_id: string;
  artifact_id: string;
  pack_type: string;
  use_web: boolean;
  pack_json: ResearchPackResp;
  brief_summary: string | null;
  user_question: string | null;
  opened_at: string | null;
  first_chat_at: string | null;
  verdict_at: string | null;
  verdict: string | null;
};

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function buildBriefSummaryFromPack(pack: ResearchPackResp): string {
  const synthesis = pack.sections.synthesis?.body?.trim();
  if (synthesis) return sanitizeResearchSectionBody(synthesis).slice(0, 1200);

  for (const lensId of getResearchPackLensOrder(pack)) {
    const body = pack.sections[lensId]?.body?.trim();
    if (body) return sanitizeResearchSectionBody(body).slice(0, 1200);
  }
  return "Research brief ready — ask a follow-up below.";
}

/** Condensed pack context for my-ai-chat (capped). */
export function buildPackContextForChat(pack: ResearchPackResp, maxChars = 9000): string {
  const md = formatResearchPackMarkdown(pack);
  if (md.length <= maxChars) return md;
  return `${md.slice(0, maxChars)}\n\n_(Research pack truncated for chat context.)_`;
}

export async function fetchLatestClaimResearchRun(
  supabase: SupabaseClient,
  userId: string,
  claimId: string,
  maxAgeMs = CACHE_MAX_AGE_MS,
): Promise<ClaimResearchRunRow | null> {
  const { data, error } = await supabase
    .from("artifact_claim_research_runs")
    .select(
      "id,created_at,user_id,artifact_claim_id,artifact_id,pack_type,use_web,pack_json,brief_summary,user_question,opened_at,first_chat_at,verdict_at,verdict",
    )
    .eq("user_id", userId)
    .eq("artifact_claim_id", claimId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const created = new Date(data.created_at as string).getTime();
  if (Date.now() - created > maxAgeMs) return null;

  return {
    ...data,
    pack_json: data.pack_json as ResearchPackResp,
  } as ClaimResearchRunRow;
}

export async function saveClaimResearchRun(
  supabase: SupabaseClient,
  input: {
    userId: string;
    claimId: string;
    artifactId: string;
    pack: ResearchPackResp;
    useWeb: boolean;
    userQuestion?: string | null;
    briefSummary?: string | null;
  },
): Promise<ClaimResearchRunRow | null> {
  const brief = input.briefSummary ?? buildBriefSummaryFromPack(input.pack);
  const packType = input.pack.pack_type ?? input.pack.meta?.pack_type ?? "validation";

  const { data, error } = await supabase
    .from("artifact_claim_research_runs")
    .insert({
      user_id: input.userId,
      artifact_claim_id: input.claimId,
      artifact_id: input.artifactId,
      pack_type: packType,
      use_web: input.useWeb,
      pack_json: input.pack as unknown as Record<string, unknown>,
      brief_summary: brief,
      user_question: input.userQuestion?.trim() || null,
      opened_at: new Date().toISOString(),
    })
    .select(
      "id,created_at,user_id,artifact_claim_id,artifact_id,pack_type,use_web,pack_json,brief_summary,user_question,opened_at,first_chat_at,verdict_at,verdict",
    )
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, pack_json: data.pack_json as ResearchPackResp } as ClaimResearchRunRow;
}

export async function touchClaimResearchRunChat(
  supabase: SupabaseClient,
  runId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from("artifact_claim_research_runs")
    .update({ first_chat_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("user_id", userId)
    .is("first_chat_at", null);
}

export async function touchClaimResearchRunVerdict(
  supabase: SupabaseClient,
  runId: string,
  userId: string,
  verdict: string,
): Promise<void> {
  await supabase
    .from("artifact_claim_research_runs")
    .update({ verdict_at: new Date().toISOString(), verdict })
    .eq("id", runId)
    .eq("user_id", userId);
}

export async function fetchLastResearchedAtByClaimIds(
  supabase: SupabaseClient,
  userId: string,
  claimIds: string[],
): Promise<Record<string, string>> {
  if (!claimIds.length) return {};
  const { data, error } = await supabase
    .from("artifact_claim_research_runs")
    .select("artifact_claim_id,created_at")
    .eq("user_id", userId)
    .in("artifact_claim_id", claimIds)
    .order("created_at", { ascending: false });

  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data) {
    const cid = row.artifact_claim_id as string;
    if (!out[cid]) out[cid] = row.created_at as string;
  }
  return out;
}
