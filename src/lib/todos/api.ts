import { supabase } from "@/integrations/supabase/client";
import { localDateISO } from "@/lib/habits/dates";
import { throwSupabaseError } from "@/lib/supabase/errors";

export type TodoPriority = 0 | 1 | 2 | 3;

export type TodoListRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  color: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoItemRow = {
  id: string;
  user_id: string;
  list_id: string | null;
  parent_id: string | null;
  title: string;
  done: boolean;
  due_date: string | null;
  priority: TodoPriority;
  sort_order: number;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SmartView = "inbox" | "today" | "upcoming" | "all" | "done";

export async function ensureDefaultLists(): Promise<void> {
  const { error } = await supabase.rpc("ensure_default_todo_lists");
  if (error) throwSupabaseError(error);
}

export async function listLists(userId: string): Promise<TodoListRow[]> {
  const { data, error } = await supabase
    .from("todo_lists")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });
  if (error) throwSupabaseError(error);
  return (data ?? []) as TodoListRow[];
}

export async function createList(
  userId: string,
  name: string,
  sortOrder: number,
): Promise<TodoListRow> {
  const { data, error } = await supabase
    .from("todo_lists")
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select("*")
    .single();
  if (error) throwSupabaseError(error);
  return data as TodoListRow;
}

export async function updateList(
  userId: string,
  id: string,
  patch: Partial<Pick<TodoListRow, "name" | "color" | "sort_order" | "archived_at">>,
): Promise<void> {
  const { error } = await supabase.from("todo_lists").update(patch).eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function reorderLists(userId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("todo_lists").update({ sort_order: i }).eq("user_id", userId).eq("id", id),
    ),
  );
}

export async function listItems(userId: string): Promise<TodoItemRow[]> {
  const { data, error } = await supabase
    .from("todo_items")
    .select("*")
    .eq("user_id", userId)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });
  if (error) throwSupabaseError(error);
  return (data ?? []) as TodoItemRow[];
}

export async function listSubtasks(userId: string, parentId: string): Promise<TodoItemRow[]> {
  const { data, error } = await supabase
    .from("todo_items")
    .select("*")
    .eq("user_id", userId)
    .eq("parent_id", parentId)
    .order("sort_order", { ascending: true });
  if (error) throwSupabaseError(error);
  return (data ?? []) as TodoItemRow[];
}

export async function createItem(
  userId: string,
  input: {
    title: string;
    list_id?: string | null;
    parent_id?: string | null;
    due_date?: string | null;
    priority?: TodoPriority;
    sort_order?: number;
    notes?: string | null;
  },
): Promise<TodoItemRow> {
  const { data, error } = await supabase
    .from("todo_items")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      list_id: input.list_id ?? null,
      parent_id: input.parent_id ?? null,
      due_date: input.due_date ?? null,
      priority: input.priority ?? 0,
      sort_order: input.sort_order ?? 0,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throwSupabaseError(error);
  return data as TodoItemRow;
}

export async function updateItem(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      TodoItemRow,
      "title" | "done" | "due_date" | "priority" | "sort_order" | "notes" | "list_id" | "completed_at"
    >
  >,
): Promise<void> {
  const { error } = await supabase.from("todo_items").update(patch).eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function toggleDone(userId: string, item: TodoItemRow, done: boolean): Promise<void> {
  await updateItem(userId, item.id, {
    done,
    completed_at: done ? new Date().toISOString() : null,
  });
}

export async function deleteItem(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("todo_items").delete().eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function reorderItems(userId: string, orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("todo_items").update({ sort_order: i }).eq("user_id", userId).eq("id", id),
    ),
  );
  const err = results.find((r) => r.error)?.error;
  if (err) throwSupabaseError(err);
}

export function inboxListId(lists: TodoListRow[]): string | null {
  return lists.find((l) => l.slug === "inbox")?.id ?? lists[0]?.id ?? null;
}

export function filterItemsForView(
  items: TodoItemRow[],
  view: SmartView | { listId: string },
  lists: TodoListRow[],
  todayISO = localDateISO(),
): TodoItemRow[] {
  const inboxId = inboxListId(lists);

  if (typeof view === "object" && "listId" in view) {
    return items.filter((i) => i.list_id === view.listId && !i.done);
  }

  switch (view) {
    case "done":
      return items.filter((i) => i.done);
    case "all":
      return items.filter((i) => !i.done);
    case "inbox":
      return items.filter((i) => !i.done && (i.list_id === null || i.list_id === inboxId));
    case "today":
      return items.filter(
        (i) =>
          !i.done &&
          i.due_date != null &&
          i.due_date <= todayISO,
      );
    case "upcoming":
      return items.filter((i) => !i.done && i.due_date != null && i.due_date > todayISO);
    default:
      return items.filter((i) => !i.done);
  }
}

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  0: "None",
  1: "High",
  2: "Medium",
  3: "Low",
};

export const PRIORITY_COLORS: Record<TodoPriority, string> = {
  0: "transparent",
  1: "bg-red-500",
  2: "bg-amber-500",
  3: "bg-sky-500",
};
