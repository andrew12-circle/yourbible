export type TodoViewMode = "list" | "table";

export const LS_TODO_VIEW_MODE = "yb.todos.viewMode";

export function readTodoViewMode(): TodoViewMode {
  try {
    const stored = localStorage.getItem(LS_TODO_VIEW_MODE);
    if (stored === "list" || stored === "table") return stored;
  } catch {
    /* ignore */
  }
  return "list";
}

export function writeTodoViewMode(mode: TodoViewMode): void {
  try {
    localStorage.setItem(LS_TODO_VIEW_MODE, mode);
  } catch {
    /* ignore */
  }
}
