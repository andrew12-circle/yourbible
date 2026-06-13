import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  CalendarClock,
  ChevronLeft,
  Inbox,
  ListTodo,
  Loader2,
  Plus,
  Sun,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { hubShellPageRoot } from "@/lib/shell/hubShellClasses";
import { localDateISO } from "@/lib/habits/dates";
import TodoItemRowComponent from "@/components/todos/TodoItemRow";
import TodoDetailSheet from "@/components/todos/TodoDetailSheet";
import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  createItem,
  createList,
  deleteItem,
  ensureDefaultLists,
  filterItemsForView,
  inboxListId,
  listItems,
  listLists,
  listSubtasks,
  reorderItems,
  toggleDone,
  updateItem,
  type SmartView,
  type TodoItemRow,
  type TodoListRow,
} from "@/lib/todos/api";

type ActiveView = SmartView | { listId: string };

function viewLabel(view: ActiveView, lists: TodoListRow[]): string {
  if (typeof view === "object") {
    return lists.find((l) => l.id === view.listId)?.name ?? "List";
  }
  const labels: Record<SmartView, string> = {
    inbox: "Inbox",
    today: "Today",
    upcoming: "Upcoming",
    all: "All",
    done: "Completed",
  };
  return labels[view];
}

export default function TodosPage() {
  const { user, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [busy, setBusy] = useState(true);
  const [lists, setLists] = useState<TodoListRow[]>([]);
  const [items, setItems] = useState<TodoItemRow[]>([]);
  const [view, setView] = useState<ActiveView>("today");
  const [draft, setDraft] = useState("");
  const [detailItem, setDetailItem] = useState<TodoItemRow | null>(null);
  const [subtasks, setSubtasks] = useState<TodoItemRow[]>([]);
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, number>>({});
  const quickRef = useRef<HTMLInputElement>(null);
  const todayISO = useMemo(() => localDateISO(), []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      await ensureDefaultLists();
      const [ls, its] = await Promise.all([listLists(user.id), listItems(user.id)]);
      setLists(ls);
      setItems(its);
      const { data: subs, error: subsError } = await supabase
        .from("todo_items")
        .select("parent_id")
        .eq("user_id", user.id)
        .not("parent_id", "is", null);
      if (subsError) throw subsError;
      const counts: Record<string, number> = {};
      for (const row of subs ?? []) {
        const pid = (row as { parent_id: string }).parent_id;
        if (pid) counts[pid] = (counts[pid] ?? 0) + 1;
      }
      setSubtaskCounts(counts);
    } catch (e) {
      toast({
        title: "Couldn't load tasks",
        description: formatSupabaseError(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        quickRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const filtered =
      typeof view === "object"
        ? filterItemsForView(items, view, lists, todayISO)
        : filterItemsForView(items, view, lists, todayISO);
    return [...filtered].sort((a, b) => a.sort_order - b.sort_order);
  }, [items, view, lists, todayISO]);

  const counts = useMemo(
    () => ({
      inbox: filterItemsForView(items, "inbox", lists, todayISO).length,
      today: filterItemsForView(items, "today", lists, todayISO).length,
      upcoming: filterItemsForView(items, "upcoming", lists, todayISO).length,
    }),
    [items, lists, todayISO],
  );

  const defaultListForView = useMemo(() => {
    if (typeof view === "object") return view.listId;
    if (view === "inbox") return inboxListId(lists);
    return inboxListId(lists);
  }, [view, lists]);

  const onQuickAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.id || !draft.trim()) return;
    const title = draft.trim();
    setDraft("");
    try {
      const sort = visible.length;
      const row = await createItem(user.id, {
        title,
        list_id: defaultListForView,
        due_date: view === "today" ? todayISO : null,
        sort_order: sort,
      });
      setItems((prev) => [...prev, row]);
    } catch (err) {
      toast({
        title: "Couldn't add task",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const onToggle = async (item: TodoItemRow, done: boolean) => {
    if (!user?.id) return;
    try {
      await toggleDone(user.id, item, done);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done, completed_at: done ? new Date().toISOString() : null } : i)));
    } catch (err) {
      toast({ title: "Couldn't update", description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const onReorder = async (fromId: string, toId: string) => {
    if (!user?.id) return;
    const ids = visible.map((i) => i.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setItems((prev) => {
      const orderMap = new Map(next.map((id, i) => [id, i]));
      return prev.map((i) =>
        orderMap.has(i.id) ? { ...i, sort_order: orderMap.get(i.id)! } : i,
      );
    });
    try {
      await reorderItems(user.id, next);
    } catch {
      void load();
    }
  };

  const openDetail = async (item: TodoItemRow) => {
    setDetailItem(item);
    if (!user?.id) return;
    const subs = await listSubtasks(user.id, item.id);
    setSubtasks(subs);
  };

  const onNewList = async () => {
    if (!user?.id) return;
    const name = window.prompt("List name");
    if (!name?.trim()) return;
    try {
      const row = await createList(user.id, name.trim(), lists.length);
      setLists((prev) => [...prev, row]);
      setView({ listId: row.id });
    } catch (err) {
      toast({ title: "Couldn't create list", description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const projectLists = lists.filter((l) => l.slug !== "inbox");

  return (
    <div
      className={hubShellPageRoot(
        showHubShell,
        "min-h-[100dvh] bg-background flex flex-col md:flex-row pb-[max(5rem,env(safe-area-inset-bottom))]",
        "bg-background flex flex-col md:flex-row min-h-0 h-full overflow-hidden",
      )}
    >
      <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r bg-card/50">
        <div className="flex items-center gap-2 px-3 py-3 border-b md:border-0">
          {!showHubShell && (
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/home" aria-label="Back to home">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          )}
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            Tasks
          </h1>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-visible scrollbar-hide">
          <ViewTab
            active={view === "inbox"}
            onClick={() => setView("inbox")}
            icon={Inbox}
            label="Inbox"
            count={counts.inbox}
          />
          <ViewTab
            active={view === "today"}
            onClick={() => setView("today")}
            icon={Sun}
            label="Today"
            count={counts.today}
          />
          <ViewTab
            active={view === "upcoming"}
            onClick={() => setView("upcoming")}
            icon={CalendarClock}
            label="Upcoming"
            count={counts.upcoming}
          />
          <ViewTab
            active={view === "all"}
            onClick={() => setView("all")}
            icon={ListTodo}
            label="All"
          />
          <ViewTab
            active={view === "done"}
            onClick={() => setView("done")}
            icon={CheckCircle2}
            label="Done"
          />
          {projectLists.length > 0 && (
            <div className="hidden md:block w-full h-px bg-border my-2" />
          )}
          {projectLists.map((l) => (
            <ViewTab
              key={l.id}
              active={typeof view === "object" && view.listId === l.id}
              onClick={() => setView({ listId: l.id })}
              icon={ListTodo}
              label={l.name}
            />
          ))}
          <Button variant="ghost" size="sm" className="shrink-0 md:w-full justify-start gap-2" onClick={onNewList}>
            <Plus className="w-4 h-4" />
            New list
          </Button>
        </nav>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col min-w-0 max-w-2xl md:max-w-none mx-auto md:mx-0 w-full">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-4">
          <h2 className="text-2xl font-semibold tracking-tight">{viewLabel(view, lists)}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {visible.length} {visible.length === 1 ? "task" : "tasks"}
            <span className="hidden sm:inline"> · Press N to add</span>
          </p>
        </header>

        <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
          {busy ? (
            <div className="flex justify-center py-16 text-muted-foreground gap-2 items-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading…
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 text-sm">
              {view === "done" ? "No completed tasks yet." : "Nothing here — add a task below."}
            </p>
          ) : (
            visible.map((item) => (
              <TodoItemRowComponent
                key={item.id}
                item={item}
                onToggle={(done) => onToggle(item, done)}
                onOpen={() => void openDetail(item)}
                onReorder={onReorder}
                draggable={view !== "done"}
                subtaskCount={subtaskCounts[item.id] ?? 0}
              />
            ))
          )}
        </div>

        {view !== "done" && (
          <form
            onSubmit={onQuickAdd}
            className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex gap-2 max-w-2xl mx-auto">
              <Input
                ref={quickRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="New task…"
                className="rounded-xl h-11 bg-secondary/50 border-0"
                aria-label="New task"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={!draft.trim()}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </form>
        )}
      </main>

      <TodoDetailSheet
        open={!!detailItem}
        item={detailItem}
        lists={lists}
        subtasks={subtasks}
        onClose={() => {
          setDetailItem(null);
          setSubtasks([]);
        }}
        onSave={async (patch) => {
          if (!user?.id || !detailItem) return;
          await updateItem(user.id, detailItem.id, patch);
          setItems((prev) => prev.map((i) => (i.id === detailItem.id ? { ...i, ...patch } : i)));
          setDetailItem((d) => (d ? { ...d, ...patch } : null));
        }}
        onDelete={async () => {
          if (!user?.id || !detailItem) return;
          await deleteItem(user.id, detailItem.id);
          setItems((prev) => prev.filter((i) => i.id !== detailItem.id));
          setDetailItem(null);
          toast({ title: "Task deleted" });
        }}
        onAddSubtask={async (title) => {
          if (!user?.id || !detailItem) return;
          const sub = await createItem(user.id, {
            title,
            parent_id: detailItem.id,
            list_id: detailItem.list_id,
            sort_order: subtasks.length,
          });
          setSubtasks((prev) => [...prev, sub]);
          setSubtaskCounts((c) => ({ ...c, [detailItem.id]: (c[detailItem.id] ?? 0) + 1 }));
        }}
        onToggleSubtask={async (sub, done) => {
          if (!user?.id) return;
          await toggleDone(user.id, sub, done);
          setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? { ...s, done } : s)));
        }}
      />
    </div>
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
