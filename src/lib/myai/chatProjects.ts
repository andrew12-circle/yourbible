import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MyAiProjectRow } from "@/lib/myai/chatSections";

export const MY_AI_PROJECT_MEMORY_MAX_LENGTH = 4000;

/** PostgREST when a table is missing from the remote schema (migration not applied yet). */
export function isMyAiProjectsTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("my_ai_projects") && (m.includes("schema cache") || m.includes("does not exist"));
}

function isMyAiProjectMemoryColumnMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("memory") &&
    (m.includes("schema cache") || m.includes("does not exist") || m.includes("could not find"))
  );
}

export function normalizeMyAiProjectMemory(memory: string): string {
  return memory.replace(/\r\n?/g, "\n").trim().slice(0, MY_AI_PROJECT_MEMORY_MAX_LENGTH);
}

export async function listMyAiProjects(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MyAiProjectRow[]> {
  const { data, error } = await supabase
    .from("my_ai_projects")
    .select("id,name,memory,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMyAiProjectMemoryColumnMissing(error.message)) {
      const legacy = await supabase
        .from("my_ai_projects")
        .select("id,name,sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (legacy.error) throw new Error(legacy.error.message);
      return ((legacy.data ?? []) as Omit<MyAiProjectRow, "memory">[]).map((row) => ({
        ...row,
        memory: "",
      }));
    }
    throw new Error(error.message);
  }
  return (data as MyAiProjectRow[]) ?? [];
}

export async function createMyAiProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
  sortOrder: number,
): Promise<MyAiProjectRow> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Project name is required");

  const { data, error } = await supabase
    .from("my_ai_projects")
    .insert({ user_id: userId, name: trimmed, sort_order: sortOrder })
    .select("id,name,sort_order")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create project");
  return { ...(data as Omit<MyAiProjectRow, "memory">), memory: "" };
}

export async function updateMyAiProjectMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  projectId: string,
  memory: string,
): Promise<MyAiProjectRow> {
  const { data, error } = await supabase
    .from("my_ai_projects")
    .update({ memory: normalizeMyAiProjectMemory(memory) })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select("id,name,memory,sort_order")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not update project memory");
  return data as MyAiProjectRow;
}

export async function deleteMyAiProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from("my_ai_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function moveChatToProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  chatId: string,
  projectId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("my_ai_chats")
    .update({ project_id: projectId })
    .eq("id", chatId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
