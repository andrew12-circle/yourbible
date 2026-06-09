import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBriefSummaryFromPack } from "@/lib/framework/claimResearchRuns";
import type { ResearchPackResp } from "@/lib/framework/claimResearchPack";

export type HardQuestionResearchRunRow = {
  id: string;
  created_at: string;
  user_id: string;
  hard_question_id: string;
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

export async function fetchLatestHardQuestionResearchRun(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  maxAgeMs = CACHE_MAX_AGE_MS,
): Promise<HardQuestionResearchRunRow | null> {
  const { data, error } = await supabase
    .from("hard_question_research_runs")
    .select(
      "id,created_at,user_id,hard_question_id,pack_type,use_web,pack_json,brief_summary,user_question,opened_at,first_chat_at,verdict_at,verdict",
    )
    .eq("user_id", userId)
    .eq("hard_question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const created = new Date(data.created_at as string).getTime();
  if (Date.now() - created > maxAgeMs) return null;

  return {
    ...data,
    pack_json: data.pack_json as ResearchPackResp,
  } as HardQuestionResearchRunRow;
}

export async function saveHardQuestionResearchRun(
  supabase: SupabaseClient,
  input: {
    userId: string;
    questionId: string;
    pack: ResearchPackResp;
    useWeb: boolean;
    userQuestion?: string | null;
    briefSummary?: string | null;
  },
): Promise<HardQuestionResearchRunRow | null> {
  const brief = input.briefSummary ?? buildBriefSummaryFromPack(input.pack);
  const packType = input.pack.pack_type ?? input.pack.meta?.pack_type ?? "standard";

  const { data, error } = await supabase
    .from("hard_question_research_runs")
    .insert({
      user_id: input.userId,
      hard_question_id: input.questionId,
      pack_type: packType,
      use_web: input.useWeb,
      pack_json: input.pack as unknown as Record<string, unknown>,
      brief_summary: brief,
      user_question: input.userQuestion?.trim() || null,
      opened_at: new Date().toISOString(),
    })
    .select(
      "id,created_at,user_id,hard_question_id,pack_type,use_web,pack_json,brief_summary,user_question,opened_at,first_chat_at,verdict_at,verdict",
    )
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, pack_json: data.pack_json as ResearchPackResp } as HardQuestionResearchRunRow;
}

export async function touchHardQuestionResearchRunChat(
  supabase: SupabaseClient,
  runId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from("hard_question_research_runs")
    .update({ first_chat_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("user_id", userId)
    .is("first_chat_at", null);
}
