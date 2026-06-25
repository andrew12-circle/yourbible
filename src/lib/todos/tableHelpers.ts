import type { TodoItemRow, TodoPriority } from "@/lib/todos/api";

export function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function priorityCellClass(priority: TodoPriority): string {
  switch (priority) {
    case 1:
      return "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200";
    case 2:
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
    case 3:
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
    default:
      return "";
  }
}

export function isRowMuted(item: TodoItemRow): boolean {
  return item.done || item.status === "done" || item.status === "cancelled";
}
