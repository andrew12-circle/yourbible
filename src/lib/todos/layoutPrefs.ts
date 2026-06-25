export type TodoContentWidth = "comfortable" | "wide" | "full";

export const LS_TODO_SIDEBAR_COLLAPSED = "yb.todos.sidebarCollapsed";
export const LS_TODO_CONTENT_WIDTH = "yb.todos.contentWidth";

export function readTodoSidebarCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(LS_TODO_SIDEBAR_COLLAPSED);
    return stored === "1" || stored === "true";
  } catch {
    return false;
  }
}

export function writeTodoSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(LS_TODO_SIDEBAR_COLLAPSED, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readTodoContentWidth(): TodoContentWidth {
  try {
    const stored = localStorage.getItem(LS_TODO_CONTENT_WIDTH);
    if (stored === "comfortable" || stored === "wide" || stored === "full") return stored;
  } catch {
    /* ignore */
  }
  return "comfortable";
}

export function writeTodoContentWidth(width: TodoContentWidth): void {
  try {
    localStorage.setItem(LS_TODO_CONTENT_WIDTH, width);
  } catch {
    /* ignore */
  }
}

export function todoContentAreaClass(width: TodoContentWidth): string {
  switch (width) {
    case "wide":
      return "px-2";
    case "full":
      return "px-0";
    default:
      return "px-4";
  }
}

export function todoMainWidthClass(
  layoutMode: "list" | "table",
  contentWidth: TodoContentWidth,
): string {
  if (layoutMode === "list") {
    return "max-w-2xl md:max-w-none mx-auto md:mx-0";
  }
  switch (contentWidth) {
    case "wide":
      return "max-w-none mx-0";
    case "full":
      return "max-w-none mx-0";
    default:
      return "max-w-2xl md:max-w-none mx-auto md:mx-0";
  }
}
