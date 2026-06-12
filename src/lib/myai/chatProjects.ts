import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MyAiProjectRow } from "@/lib/myai/chatSections";

export async function listMyAiProjects(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MyAiProjectRow[]> {
  const { data, error } = await supabase
    .from("my_ai_projects")
    .select("id,name,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
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
