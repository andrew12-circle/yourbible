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

export type SmartView = "inbox" | "today" | "upcoming" | "backlog" | "all" | "done";

/** Default folder slugs (Inbox is a smart view, not shown in the folders section). */
export const DEFAULT_FOLDER_SLUGS = ["work", "personal", "home"] as const;
export type DefaultFolderSlug = (typeof DEFAULT_FOLDER_SLUGS)[number];

/** Days ahead that still count as "Upcoming" vs "Backlog". */
export const UPCOMING_HORIZON_DAYS = 7;

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

export function homeListId(lists: TodoListRow[]): string | null {
  return lists.find((l) => l.slug === "home")?.id ?? null;
}

export function defaultFolderLists(lists: TodoListRow[]): TodoListRow[] {
  const order = new Map(DEFAULT_FOLDER_SLUGS.map((slug, i) => [slug, i]));
  return lists
    .filter((l): l is TodoListRow & { slug: DefaultFolderSlug } =>
      DEFAULT_FOLDER_SLUGS.includes(l.slug as DefaultFolderSlug),
    )
    .sort((a, b) => (order.get(a.slug)! ?? 99) - (order.get(b.slug)! ?? 99));
}

export function customLists(lists: TodoListRow[]): TodoListRow[] {
  const defaults = new Set<string>(["inbox", ...DEFAULT_FOLDER_SLUGS]);
  return lists.filter((l) => !l.slug || !defaults.has(l.slug));
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isOverdue(
  item: Pick<TodoItemRow, "end_date" | "due_date" | "done">,
  todayISO = localDateISO(),
): boolean {
  if (item.done) return false;
  const end = effectiveEndDate(item);
  return end != null && end < todayISO;
}

export function isDueToday(
  item: Pick<TodoItemRow, "end_date" | "due_date">,
  todayISO = localDateISO(),
): boolean {
  const end = effectiveEndDate(item);
  return end === todayISO;
}

export type TodaySection = "overdue" | "today" | "pinned";

export function todaySection(
  item: TodoItemRow,
  todayISO = localDateISO(),
): TodaySection | null {
  if (item.done) return null;
  if (isPinnedToday(item, todayISO) && !isDueToday(item, todayISO) && !isOverdue(item, todayISO)) {
    return "pinned";
  }
  if (isOverdue(item, todayISO)) return "overdue";
  if (isDueToday(item, todayISO) || isPinnedToday(item, todayISO)) return "today";
  return null;
}

export function partitionTodayItems(
  items: TodoItemRow[],
  todayISO = localDateISO(),
): { overdue: TodoItemRow[]; today: TodoItemRow[]; pinned: TodoItemRow[]; done: TodoItemRow[] } {
  const overdue: TodoItemRow[] = [];
  const today: TodoItemRow[] = [];
  const pinned: TodoItemRow[] = [];
  const done: TodoItemRow[] = [];

  for (const item of items) {
    if (item.done) {
      done.push(item);
      continue;
    }
    const section = todaySection(item, todayISO);
    if (section === "overdue") overdue.push(item);
    else if (section === "today") today.push(item);
    else if (section === "pinned") pinned.push(item);
  }

  const sortOpen = (a: TodoItemRow, b: TodoItemRow) => {
    const aPinned = isPinnedToday(a, todayISO);
    const bPinned = isPinnedToday(b, todayISO);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return a.sort_order - b.sort_order;
  };

  overdue.sort(sortOpen);
  today.sort(sortOpen);
  pinned.sort(sortOpen);
  done.sort((a, b) => {
    const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bTime - aTime;
  });

  return { overdue, today, pinned, done };
}

/** Sort key for backlog: 1 (high) first, then 2, 3, 0/none last. */
export function backlogPrioritySortKey(priority: TodoPriority): number {
  return priority === 0 ? 4 : priority;
}

export function compareOpenByBacklogPriority(a: TodoItemRow, b: TodoItemRow): number {
  const pa = backlogPrioritySortKey(a.priority);
  const pb = backlogPrioritySortKey(b.priority);
  if (pa !== pb) return pa - pb;
  return a.sort_order - b.sort_order;
}

export function partitionBacklogByList(
  items: TodoItemRow[],
  lists: TodoListRow[],
): { list: TodoListRow | null; items: TodoItemRow[] }[] {
  const open = items.filter((i) => !i.done);
  const byList = new Map<string | null, TodoItemRow[]>();

  for (const item of open) {
    const key = item.list_id;
    const bucket = byList.get(key) ?? [];
    bucket.push(item);
    byList.set(key, bucket);
  }

  const listOrder = lists.map((l) => l.id);
  const sections: { list: TodoListRow | null; items: TodoItemRow[] }[] = [];

  for (const list of lists) {
    const bucket = byList.get(list.id);
    if (bucket?.length) {
      bucket.sort(compareOpenByBacklogPriority);
      sections.push({ list, items: bucket });
      byList.delete(list.id);
    }
  }

  for (const [listId, bucket] of byList) {
    if (!bucket.length) continue;
    bucket.sort(compareOpenByBacklogPriority);
    const list = listId ? (lists.find((l) => l.id === listId) ?? null) : null;
    sections.push({ list, items: bucket });
  }

  sections.sort((a, b) => {
    const aIdx = a.list ? listOrder.indexOf(a.list.id) : 999;
    const bIdx = b.list ? listOrder.indexOf(b.list.id) : 999;
    return aIdx - bIdx;
  });

  return sections;
}

/** Whether an item belongs in a view (open or completed). */
export function itemMatchesView(
  item: TodoItemRow,
  view: SmartView | { listId: string },
  lists: TodoListRow[],
  todayISO = localDateISO(),
): boolean {
  const inboxId = inboxListId(lists);

  if (typeof view === "object" && "listId" in view) {
    return item.list_id === view.listId;
  }

  switch (view) {
    case "done":
      return item.done;
    case "all":
      return true;
    case "inbox":
      return item.list_id === null || item.list_id === inboxId;
    case "today": {
      const end = effectiveEndDate(item);
      return (end != null && end <= todayISO) || isPinnedToday(item, todayISO);
    }
    case "upcoming": {
      const end = effectiveEndDate(item);
      const horizon = addDaysISO(todayISO, UPCOMING_HORIZON_DAYS);
      return end != null && end > todayISO && end <= horizon;
    }
    case "backlog": {
      const end = effectiveEndDate(item);
      const horizon = addDaysISO(todayISO, UPCOMING_HORIZON_DAYS);
      return end == null || end > horizon;
    }
    default:
      return true;
  }
}

export function filterItemsForView(
  items: TodoItemRow[],
  view: SmartView | { listId: string },
  lists: TodoListRow[],
  todayISO = localDateISO(),
  taskTypeFilter: TodoTaskType | null = null,
  openOnly = false,
): TodoItemRow[] {
  let filtered = items.filter((i) => {
    if (!itemMatchesView(i, view, lists, todayISO)) return false;
    if (openOnly && i.done) return false;
    return true;
  });

  if (taskTypeFilter) {
    filtered = filtered.filter((i) => i.task_type === taskTypeFilter);
  }

  return filtered;
}

/** Open tasks first, then completed (completed_at desc). Backlog: priority then sort_order; else pinned then sort_order. */
export function sortItemsForView(
  items: TodoItemRow[],
  todayISO = localDateISO(),
  view?: SmartView | { listId: string },
): TodoItemRow[] {
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  if (view === "backlog") {
    open.sort(compareOpenByBacklogPriority);
  } else {
    open.sort((a, b) => {
      const aPinned = isPinnedToday(a, todayISO);
      const bPinned = isPinnedToday(b, todayISO);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  }
  done.sort((a, b) => {
    const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bTime - aTime;
  });

  return [...open, ...done];
}
