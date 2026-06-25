import { supabase } from "@/integrations/supabase/client";
import { localDateISO } from "@/lib/habits/dates";
import { throwSupabaseError } from "@/lib/supabase/errors";

export type TodoPriority = 0 | 1 | 2 | 3;
export type TodoListKind = "work" | "personal";

export type TodoTaskType =
  | "work"
  | "educational"
  | "familiar"
  | "financial"
  | "friends"
  | "health"
  | "home"
  | "laboral"
  | "meeting"
  | "personal";

export type TodoStatus = "not_started" | "in_progress" | "done" | "cancelled";

export type TodoListRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  color: string | null;
  kind: TodoListKind | null;
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
  task_type: TodoTaskType | null;
  start_date: string | null;
  end_date: string | null;
  status: TodoStatus;
  pinned_for_date: string | null;
  priority: TodoPriority;
  sort_order: number;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SmartView = "inbox" | "today" | "upcoming" | "all" | "done";

export const TASK_TYPES: TodoTaskType[] = [
  "work",
  "educational",
  "familiar",
  "financial",
  "friends",
  "health",
  "home",
  "laboral",
  "meeting",
  "personal",
];

export const TASK_TYPE_LABELS: Record<TodoTaskType, string> = {
  work: "Work",
  educational: "Educational",
  familiar: "Familiar",
  financial: "Financial",
  friends: "Friends",
  health: "Health",
  home: "Home",
  laboral: "Laboral",
  meeting: "Meeting",
  personal: "Personal",
};

/** Left border Tailwind color per task type (4px stripe). */
export const TASK_TYPE_BORDER_COLORS: Record<TodoTaskType, string> = {
  work: "border-l-blue-500",
  educational: "border-l-violet-500",
  familiar: "border-l-pink-500",
  financial: "border-l-emerald-600",
  friends: "border-l-cyan-500",
  health: "border-l-rose-500",
  home: "border-l-amber-600",
  laboral: "border-l-orange-500",
  meeting: "border-l-indigo-500",
  personal: "border-l-teal-500",
};

export const STATUS_LABELS: Record<TodoStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const STATUS_BADGE_CLASSES: Record<TodoStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  0: "None",
  1: "III — High",
  2: "II — Medium",
  3: "I — Low",
};

export const PRIORITY_COLORS: Record<TodoPriority, string> = {
  0: "transparent",
  1: "bg-red-500",
  2: "bg-amber-400",
  3: "bg-emerald-500",
};

/** Effective due/end date (end_date preferred, due_date legacy fallback). */
export function effectiveEndDate(item: Pick<TodoItemRow, "end_date" | "due_date">): string | null {
  return item.end_date ?? item.due_date ?? null;
}

export function remainingDays(
  endDate: string | null,
  todayISO = localDateISO(),
): number | null {
  if (!endDate) return null;
  const end = new Date(endDate + "T12:00:00");
  const today = new Date(todayISO + "T12:00:00");
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export function isPinnedToday(
  item: Pick<TodoItemRow, "pinned_for_date">,
  todayISO = localDateISO(),
): boolean {
  return item.pinned_for_date === todayISO;
}

export async function ensureDefaultLists(): Promise<void> {
  const { error } = await supabase.rpc("ensure_default_todo_lists");
  if (error) throwSupabaseError(error);
}

export async function clearExpiredPins(userId: string, todayISO = localDateISO()): Promise<void> {
  const { error } = await supabase
    .from("todo_items")
    .update({ pinned_for_date: null })
    .eq("user_id", userId)
    .not("pinned_for_date", "is", null)
    .lt("pinned_for_date", todayISO);
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
  kind?: TodoListKind | null,
): Promise<TodoListRow> {
  const { data, error } = await supabase
    .from("todo_lists")
    .insert({ user_id: userId, name, sort_order: sortOrder, kind: kind ?? null })
    .select("*")
    .single();
  if (error) throwSupabaseError(error);
  return data as TodoListRow;
}

export async function updateList(
  userId: string,
  id: string,
  patch: Partial<Pick<TodoListRow, "name" | "color" | "kind" | "sort_order" | "archived_at">>,
): Promise<void> {
  const { error } = await supabase.from("todo_lists").update(patch).eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function reorderLists(userId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((i, idx) =>
      supabase.from("todo_lists").update({ sort_order: idx }).eq("user_id", userId).eq("id", i),
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

type CreateItemInput = {
  title: string;
  list_id?: string | null;
  parent_id?: string | null;
  due_date?: string | null;
  end_date?: string | null;
  start_date?: string | null;
  task_type?: TodoTaskType | null;
  status?: TodoStatus;
  priority?: TodoPriority;
  sort_order?: number;
  notes?: string | null;
  pinned_for_date?: string | null;
};

function syncDateFields(input: CreateItemInput): {
  due_date: string | null;
  end_date: string | null;
} {
  const end = input.end_date ?? input.due_date ?? null;
  return { due_date: end, end_date: end };
}

export async function createItem(userId: string, input: CreateItemInput): Promise<TodoItemRow> {
  const dates = syncDateFields(input);
  const status = input.status ?? "not_started";
  const done = status === "done";
  const { data, error } = await supabase
    .from("todo_items")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      list_id: input.list_id ?? null,
      parent_id: input.parent_id ?? null,
      due_date: dates.due_date,
      end_date: dates.end_date,
      start_date: input.start_date ?? null,
      task_type: input.task_type ?? null,
      status,
      done,
      priority: input.priority ?? 0,
      sort_order: input.sort_order ?? 0,
      notes: input.notes ?? null,
      pinned_for_date: input.pinned_for_date ?? null,
      completed_at: done ? new Date().toISOString() : null,
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
      | "title"
      | "done"
      | "due_date"
      | "end_date"
      | "start_date"
      | "task_type"
      | "status"
      | "pinned_for_date"
      | "priority"
      | "sort_order"
      | "notes"
      | "list_id"
      | "completed_at"
    >
  >,
): Promise<void> {
  const next: typeof patch = { ...patch };
  if ("end_date" in patch || "due_date" in patch) {
    const end = patch.end_date ?? patch.due_date ?? null;
    next.end_date = end;
    next.due_date = end;
  }
  if (patch.status === "done") {
    next.done = true;
    next.completed_at = new Date().toISOString();
  } else if (patch.status && patch.status !== "done") {
    next.done = false;
    next.completed_at = null;
  }
  if (patch.done === true && !patch.status) {
    next.status = "done";
    next.completed_at = new Date().toISOString();
  } else if (patch.done === false && !patch.status) {
    next.status = "not_started";
    next.completed_at = null;
  }
  const { error } = await supabase.from("todo_items").update(next).eq("user_id", userId).eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function toggleDone(userId: string, item: TodoItemRow, done: boolean): Promise<void> {
  await updateItem(userId, item.id, {
    done,
    status: done ? "done" : item.status === "done" ? "not_started" : item.status,
    completed_at: done ? new Date().toISOString() : null,
  });
}

export async function togglePinForToday(
  userId: string,
  item: TodoItemRow,
  todayISO = localDateISO(),
): Promise<string | null> {
  const next = isPinnedToday(item, todayISO) ? null : todayISO;
  await updateItem(userId, item.id, { pinned_for_date: next });
  return next;
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
  taskTypeFilter: TodoTaskType | null = null,
): TodoItemRow[] {
  const inboxId = inboxListId(lists);

  let filtered: TodoItemRow[];

  if (typeof view === "object" && "listId" in view) {
    filtered = items.filter((i) => i.list_id === view.listId && !i.done);
  } else {
    switch (view) {
      case "done":
        filtered = items.filter((i) => i.done);
        break;
      case "all":
        filtered = items.filter((i) => !i.done);
        break;
      case "inbox":
        filtered = items.filter((i) => !i.done && (i.list_id === null || i.list_id === inboxId));
        break;
      case "today":
        filtered = items.filter((i) => {
          if (i.done) return false;
          const end = effectiveEndDate(i);
          return (end != null && end <= todayISO) || isPinnedToday(i, todayISO);
        });
        break;
      case "upcoming":
        filtered = items.filter((i) => {
          if (i.done) return false;
          const end = effectiveEndDate(i);
          return end != null && end > todayISO;
        });
        break;
      default:
        filtered = items.filter((i) => !i.done);
    }
  }

  if (taskTypeFilter) {
    filtered = filtered.filter((i) => i.task_type === taskTypeFilter);
  }

  return filtered;
}
