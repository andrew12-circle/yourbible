import { useCallback, useState } from "react";

import {
  readTodoContentWidth,
  readTodoSidebarCollapsed,
  writeTodoContentWidth,
  writeTodoSidebarCollapsed,
  type TodoContentWidth,
} from "@/lib/todos/layoutPrefs";

export function useTodosLayout() {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => readTodoSidebarCollapsed());
  const [contentWidth, setContentWidthState] = useState<TodoContentWidth>(() => readTodoContentWidth());

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    writeTodoSidebarCollapsed(collapsed);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const setContentWidth = useCallback((width: TodoContentWidth) => {
    setContentWidthState(width);
    writeTodoContentWidth(width);
  }, []);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    contentWidth,
    setContentWidth,
  };
}
