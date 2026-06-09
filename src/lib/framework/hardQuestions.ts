import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import type { FrameworkLayer } from "@/data/framework";
import { getHardQuestionSeed, type HardQuestionSeed } from "@/data/hardQuestionSeeds";

export type HardQuestionStatus = "open" | "researching" | "concluded" | "parked";

export type HardQuestionRow = {
  id: string;
  user_id: string;
  title: string;
  framing: string | null;
  why_it_matters: string | null;
  current_thinking: string | null;
  notes: string;
  status: HardQuestionStatus;
  conclusion: string | null;
  confidence: number | null;
  layer: FrameworkLayer | null;
  tags: string[];
  scripture_refs: Json;
  linked_belief_ids: string[];
  seed_key: string | null;
  created_at: string;
  updated_at: string;
};

export type HardQuestionSourceRow = {
  id: string;
  hard_question_id: string;
  artifact_id: string | null;
  url: string | null;
  label: string;
  snippet: string | null;
  kind: "artifact" | "link" | "note" | "voice";
  created_at: string;
};

export type CreateHardQuestionInput = {
  title: string;
  framing?: string;
  whyItMatters?: string;
  currentThinking?: string;
  layer?: FrameworkLayer | null;
  tags?: string[];
  scriptureRefs?: { ref: string; role: string }[];
  seedKey?: string | null;
  status?: HardQuestionStatus;
};

function seedToInsert(userId: string, seed: HardQuestionSeed): Record<string, unknown> {
  return {
    user_id: userId,
    title: seed.title,
    framing: seed.framing,
    why_it_matters: seed.whyItMatters,
    layer: seed.layer ?? null,
    tags: seed.tags,
    scripture_refs: seed.scriptureRefs,
    seed_key: seed.key,
    status: "open",
    notes: "",
  };
}

export async function createHardQuestion(
  supabase: SupabaseClient,
  userId: string,
  input: CreateHardQuestionInput,
): Promise<HardQuestionRow | null> {
  const { data, error } = await supabase
    .from("framework_hard_questions")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      framing: input.framing?.trim() || null,
      why_it_matters: input.whyItMatters?.trim() || null,
      current_thinking: input.currentThinking?.trim() || null,
      layer: input.layer ?? null,
      tags: input.tags ?? [],
      scripture_refs: input.scriptureRefs ?? [],
      seed_key: input.seedKey ?? null,
      status: input.status ?? "open",
    })
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return data as HardQuestionRow;
}

export async function instantiateHardQuestionSeed(
  supabase: SupabaseClient,
  userId: string,
  seedKey: string,
): Promise<HardQuestionRow | null> {
  const seed = getHardQuestionSeed(seedKey);
  if (!seed) return null;

  const { data: existing } = await supabase
    .from("framework_hard_questions")
    .select("id")
    .eq("user_id", userId)
    .eq("seed_key", seedKey)
    .maybeSingle();

  if (existing?.id) {
    const { data } = await supabase
      .from("framework_hard_questions")
      .select("*")
      .eq("id", existing.id)
      .maybeSingle();
    return (data as HardQuestionRow) ?? null;
  }

  const { data, error } = await supabase
    .from("framework_hard_questions")
    .insert(seedToInsert(userId, seed))
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return data as HardQuestionRow;
}

export async function fetchHardQuestions(
  supabase: SupabaseClient,
  userId: string,
  status?: HardQuestionStatus | "all",
): Promise<HardQuestionRow[]> {
  let q = supabase
    .from("framework_hard_questions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data as HardQuestionRow[];
}

export async function fetchHardQuestionById(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<HardQuestionRow | null> {
  const { data, error } = await supabase
    .from("framework_hard_questions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as HardQuestionRow;
}

export async function updateHardQuestion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<{
    title: string;
    framing: string | null;
    why_it_matters: string | null;
    current_thinking: string | null;
    notes: string;
    status: HardQuestionStatus;
    conclusion: string | null;
    confidence: number | null;
    layer: FrameworkLayer | null;
    tags: string[];
    scripture_refs: Json;
    linked_belief_ids: string[];
  }>,
): Promise<boolean> {
  const { error } = await supabase
    .from("framework_hard_questions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function deleteHardQuestion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("framework_hard_questions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function fetchHardQuestionSources(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
): Promise<HardQuestionSourceRow[]> {
  const { data, error } = await supabase
    .from("hard_question_sources")
    .select("id,hard_question_id,artifact_id,url,label,snippet,kind,created_at")
    .eq("user_id", userId)
    .eq("hard_question_id", questionId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as HardQuestionSourceRow[];
}

export async function addHardQuestionSource(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  input: {
    label: string;
    kind: HardQuestionSourceRow["kind"];
    snippet?: string | null;
    url?: string | null;
    artifactId?: string | null;
  },
): Promise<HardQuestionSourceRow | null> {
  const { data, error } = await supabase
    .from("hard_question_sources")
    .insert({
      user_id: userId,
      hard_question_id: questionId,
      label: input.label.trim(),
      kind: input.kind,
      snippet: input.snippet?.trim() || null,
      url: input.url?.trim() || null,
      artifact_id: input.artifactId ?? null,
    })
    .select("id,hard_question_id,artifact_id,url,label,snippet,kind,created_at")
    .maybeSingle();

  if (error || !data) return null;
  return data as HardQuestionSourceRow;
}

export async function removeHardQuestionSource(
  supabase: SupabaseClient,
  userId: string,
  sourceId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("hard_question_sources")
    .delete()
    .eq("id", sourceId)
    .eq("user_id", userId);
  return !error;
}

export function statusLabel(status: HardQuestionStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "researching":
      return "Researching";
    case "concluded":
      return "Concluded";
    case "parked":
      return "Parked";
    default:
      return status;
  }
}
