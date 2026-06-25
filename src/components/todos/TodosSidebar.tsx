import { Link } from "react-router-dom";
import {
  Archive,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Home,
  Inbox,
  ListTodo,
  PanelLeftClose,
  Plus,
  Sun,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DefaultFolderSlug, SmartView, TodoListRow } from "@/lib/todos/api";

export type ActiveView = SmartView | { listId: string };

type Props = {
  showHubShell: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  view: ActiveView;
  onViewChange: (view: ActiveView) => void;
  counts: { inbox: number; today: number; upcoming: number; backlog: number; overdue: number };
  folderLists: TodoListRow[];
  customLists: TodoListRow[];
  onNewList: () => void;
};

const FOLDER_ICONS: Record<DefaultFolderSlug, React.ComponentType<{ className?: string }>> = {
  work: Briefcase,
  personal: User,
  home: Home,
};

export default function TodosSidebar({
  showHubShell,
  collapsed,
  onToggleCollapse,
  view,
  onViewChange,
  counts,
  folderLists,
  customLists,
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
          badge={counts.overdue > 0 ? `${counts.overdue} late` : undefined}
        />
        <ViewTab
          active={view === "upcoming"}
          onClick={() => onViewChange("upcoming")}
          icon={CalendarClock}
          label="Upcoming"
          count={counts.upcoming}
        />
        <ViewTab
          active={view === "backlog"}
          onClick={() => onViewChange("backlog")}
          icon={Archive}
          label="Backlog"
          count={counts.backlog}
        />
        <ViewTab active={view === "all"} onClick={() => onViewChange("all")} icon={ListTodo} label="All" />
        <ViewTab
          active={view === "done"}
          onClick={() => onViewChange("done")}
          icon={CheckCircle2}
          label="Done"
        />

        {folderLists.length > 0 && <SidebarDivider label="Folders" />}
        {folderLists.map((l) => {
          const Icon =
            l.slug && l.slug in FOLDER_ICONS
              ? FOLDER_ICONS[l.slug as DefaultFolderSlug]
              : ListTodo;
          return (
            <ViewTab
              key={l.id}
              active={typeof view === "object" && view.listId === l.id}
              onClick={() => onViewChange({ listId: l.id })}
              icon={Icon}
              label={l.name}
            />
          );
        })}

        {customLists.length > 0 && <SidebarDivider label="My lists" />}
        {customLists.map((l) => (
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

function SidebarDivider({ label }: { label: string }) {
  return (
    <div className="hidden md:flex w-full items-center gap-2 px-2 my-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  badge?: string;
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
      <span className="flex-1 text-left truncate">{label}</span>
      {badge ? (
        <span className="text-[10px] font-medium tabular-nums bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded-md">
          {badge}
        </span>
      ) : null}
      {count !== undefined && count > 0 && (
        <span className="text-xs tabular-nums bg-secondary px-1.5 py-0.5 rounded-md">{count}</span>
      )}
    </button>
  );
}
