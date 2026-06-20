import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionForGodStatus = "waiting" | "insight" | "released" | "unknown";

export type QuestionForGodRow = {
  id: string;
  user_id: string;
  question: string;
  context: string | null;
  notes: string;
  insight: string | null;
  status: QuestionForGodStatus;
  created_at: string;
  updated_at: string;
};

export type CreateQuestionForGodInput = {
  question: string;
  context?: string;
  notes?: string;
  insight?: string;
  status?: QuestionForGodStatus;
};

export const QUESTION_FOR_GOD_STATUSES: { id: QuestionForGodStatus; label: string; hint: string }[] = [
  { id: "waiting", label: "Waiting", hint: "Still holding this before God" },
  { id: "insight", label: "Partial insight", hint: "Something shifted — a word, sense, or direction" },
  { id: "released", label: "Released", hint: "Let it go — okay not knowing right now" },
  { id: "unknown", label: "May never know", hint: "Fine if God never answers this one" },
];

export function statusLabel(status: QuestionForGodStatus): string {
  return QUESTION_FOR_GOD_STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function statusHint(status: QuestionForGodStatus): string {
  return QUESTION_FOR_GOD_STATUSES.find((s) => s.id === status)?.hint ?? "";
}

export async function createQuestionForGod(
  supabase: SupabaseClient,
  userId: string,
  input: CreateQuestionForGodInput,
): Promise<QuestionForGodRow | null> {
  const { data, error } = await supabase
    .from("questions_for_god")
    .insert({
      user_id: userId,
      question: input.question.trim(),
      context: input.context?.trim() || null,
      notes: input.notes?.trim() ?? "",
      insight: input.insight?.trim() || null,
      status: input.status ?? "waiting",
    })
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return data as QuestionForGodRow;
}

export async function fetchQuestionsForGod(
  supabase: SupabaseClient,
  userId: string,
  status?: QuestionForGodStatus | "all",
): Promise<QuestionForGodRow[]> {
  let q = supabase
    .from("questions_for_god")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data as QuestionForGodRow[];
}

export async function fetchQuestionForGodById(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<QuestionForGodRow | null> {
  const { data, error } = await supabase
    .from("questions_for_god")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as QuestionForGodRow;
}

export async function updateQuestionForGod(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<{
    question: string;
    context: string | null;
    notes: string;
    insight: string | null;
    status: QuestionForGodStatus;
  }>,
): Promise<boolean> {
  const { error } = await supabase
    .from("questions_for_god")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function deleteQuestionForGod(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("questions_for_god")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export function formatQuestionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
