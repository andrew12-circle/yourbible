import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  ListTodo,
  PanelLeftClose,
  Plus,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SmartView, TodoListRow } from "@/lib/todos/api";

export type ActiveView = SmartView | { listId: string };

type Props = {
  showHubShell: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  view: ActiveView;
  onViewChange: (view: ActiveView) => void;
  counts: { inbox: number; today: number; upcoming: number };
  projectLists: TodoListRow[];
  onNewList: () => void;
};

export default function TodosSidebar({
  showHubShell,
  collapsed,
  onToggleCollapse,
  view,
  onViewChange,
  counts,
  projectLists,
  onNewList,
}: Props) {
  return (
    <aside
      className={cn(
        "md:w-56 shrink-0 border-b md:border-b-0 md:border-r bg-card/50",
        collapsed && "md:hidden",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b md:border-0">
        {!showHubShell && (
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/home" aria-label="Back to home">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
        )}
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2 min-w-0 flex-1">
          <ListTodo className="w-5 h-5 text-primary shrink-0" />
          Tasks
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex h-8 w-8 shrink-0"
          onClick={onToggleCollapse}
          aria-label="Collapse tasks sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>

      <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-visible scrollbar-hide">
        <ViewTab
          active={view === "inbox"}
          onClick={() => onViewChange("inbox")}
          icon={Inbox}
          label="Inbox"
          count={counts.inbox}
        />
        <ViewTab
          active={view === "today"}
          onClick={() => onViewChange("today")}
          icon={Sun}
          label="Today"
          count={counts.today}
        />
        <ViewTab
          active={view === "upcoming"}
          onClick={() => onViewChange("upcoming")}
          icon={CalendarClock}
          label="Upcoming"
          count={counts.upcoming}
        />
        <ViewTab
          active={view === "all"}
          onClick={() => onViewChange("all")}
          icon={ListTodo}
          label="All"
        />
        <ViewTab
          active={view === "done"}
          onClick={() => onViewChange("done")}
          icon={CheckCircle2}
          label="Done"
        />
        {projectLists.length > 0 && <div className="hidden md:block w-full h-px bg-border my-2" />}
        {projectLists.map((l) => (
          <ViewTab
            key={l.id}
            active={typeof view === "object" && view.listId === l.id}
            onClick={() => onViewChange({ listId: l.id })}
            icon={ListTodo}
            label={l.name}
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 md:w-full justify-start gap-2"
          onClick={onNewList}
        >
          <Plus className="w-4 h-4" />
          New list
        </Button>
      </nav>
    </aside>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition shrink-0 md:w-full",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs tabular-nums bg-secondary px-1.5 py-0.5 rounded-md">{count}</span>
      )}
    </button>
  );
}
