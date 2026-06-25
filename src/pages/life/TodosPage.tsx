import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Navigate } from "react-router-dom";

import {
  GalleryHorizontal,
  Loader2,
  Maximize2,
  PanelLeft,
  StretchHorizontal,
  LayoutList,
  Table2,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

import { useAppShellMode } from "@/hooks/useAppShellMode";
import { useTodosLayout } from "@/hooks/useTodosLayout";

import { Button } from "@/components/ui/button";

import {

  Dialog,

  DialogContent,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { toast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";

import { hubShellPageRoot } from "@/lib/shell/hubShellClasses";

import { localDateISO } from "@/lib/habits/dates";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import TodoItemRowComponent from "@/components/todos/TodoItemRow";
import TodoDetailSheet from "@/components/todos/TodoDetailSheet";
import TodoQuickAdd from "@/components/todos/TodoQuickAdd";
import TodoTableView from "@/components/todos/TodoTableView";
import TodoSectionedList from "@/components/todos/TodoSectionedList";
import TodosSidebar, { type ActiveView } from "@/components/todos/TodosSidebar";

import { supabase } from "@/integrations/supabase/client";

import { formatSupabaseError, throwSupabaseError } from "@/lib/supabase/errors";

import {

  clearExpiredPins,

  createItem,

  createList,

  customLists,

  defaultFolderLists,

  deleteItem,

  ensureDefaultLists,

  filterItemsForView,

  inboxListId,

  isOverdue,

  listItems,

  listLists,

  listSubtasks,

  partitionBacklogByList,

  partitionTodayItems,

  reorderItems,

  TASK_TYPE_LABELS,

  TASK_TYPES,

  toggleDone,

  togglePinForToday,

  updateItem,

  sortItemsForView,

  type TodoItemRow,

  type TodoListRow,

  type TodoPriority,

  type TodoStatus,

  type TodoTaskType,

} from "@/lib/todos/api";

import { listEmptyMessage, SMART_VIEW_LABELS, SMART_VIEW_SUBTITLES, smartViewEmptyMessage } from "@/lib/todos/viewCopy";

import { readTodoViewMode, writeTodoViewMode, type TodoViewMode } from "@/lib/todos/viewMode";
import {
  todoContentAreaClass,
  todoMainWidthClass,
} from "@/lib/todos/layoutPrefs";



function viewLabel(view: ActiveView, lists: TodoListRow[]): string {
  if (typeof view === "object") {
    return lists.find((l) => l.id === view.listId)?.name ?? "List";
  }
  return SMART_VIEW_LABELS[view];
}

function viewSubtitle(view: ActiveView, lists: TodoListRow[]): string | null {
  if (typeof view === "object") {
    const list = lists.find((l) => l.id === view.listId);
    if (list?.slug === "home") {
      return "Big home and project ideas — schedule or pin when ready.";
    }
    return null;
  }
  return SMART_VIEW_SUBTITLES[view] ?? null;
}



export default function TodosPage() {

  const { user, loading } = useAuth();

  const { showHubShell } = useAppShellMode();
  const { sidebarCollapsed, toggleSidebar, contentWidth, setContentWidth } = useTodosLayout();

  const [busy, setBusy] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [lists, setLists] = useState<TodoListRow[]>([]);

  const [items, setItems] = useState<TodoItemRow[]>([]);

  const [view, setView] = useState<ActiveView>("today");

  const [typeFilter, setTypeFilter] = useState<TodoTaskType | null>(null);

  const [detailItem, setDetailItem] = useState<TodoItemRow | null>(null);

  const [subtasks, setSubtasks] = useState<TodoItemRow[]>([]);

  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, number>>({});

  const [newListOpen, setNewListOpen] = useState(false);

  const [newListName, setNewListName] = useState("");

  const [creatingList, setCreatingList] = useState(false);

  const [layoutMode, setLayoutMode] = useState<TodoViewMode>(() => readTodoViewMode());

  const quickRef = useRef<HTMLInputElement>(null);

  const todayISO = useMemo(() => localDateISO(), []);

  useEffect(() => {
    try {
      localStorage.removeItem("journal.dictation.prefer_media");
    } catch {
      /* ignore */
    }
  }, []);



  const load = useCallback(async () => {

    if (!user?.id) return;

    setBusy(true);

    setLoadError(null);

    try {

      await ensureDefaultLists();

      await clearExpiredPins(user.id, todayISO);

      const [ls, its] = await Promise.all([listLists(user.id), listItems(user.id)]);

      setLists(ls);

      setItems(its);

      const { data: subs, error: subsError } = await supabase

        .from("todo_items")

        .select("parent_id")

        .eq("user_id", user.id)

        .not("parent_id", "is", null);

      if (subsError) throwSupabaseError(subsError);

      const counts: Record<string, number> = {};

      for (const row of subs ?? []) {

        const pid = (row as { parent_id: string }).parent_id;

        if (pid) counts[pid] = (counts[pid] ?? 0) + 1;

      }

      setSubtaskCounts(counts);

    } catch (e) {

      const message = formatSupabaseError(e);

      setLoadError(message);

      toast({

        title: "Couldn't load tasks",

        description: message,

        variant: "destructive",

      });

    } finally {

      setBusy(false);

    }

  }, [user?.id, todayISO]);



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

    const filtered = filterItemsForView(items, view, lists, todayISO, typeFilter);

    return sortItemsForView(filtered, todayISO, typeof view === "string" ? view : undefined);

  }, [items, view, lists, todayISO, typeFilter]);



  const counts = useMemo(
    () => {
      const openToday = filterItemsForView(items, "today", lists, todayISO, null, true);
      return {
        inbox: filterItemsForView(items, "inbox", lists, todayISO, null, true).length,
        today: openToday.length,
        upcoming: filterItemsForView(items, "upcoming", lists, todayISO, null, true).length,
        backlog: filterItemsForView(items, "backlog", lists, todayISO, null, true).length,
        overdue: openToday.filter((i) => isOverdue(i, todayISO)).length,
      };
    },
    [items, lists, todayISO],
  );

  const folderLists = useMemo(() => defaultFolderLists(lists), [lists]);
  const userCustomLists = useMemo(() => customLists(lists), [lists]);



  const activeListId = useMemo(() => {

    if (typeof view !== "object") return null;

    return view.listId;

  }, [view]);



  const defaultEndForView = view === "today" ? todayISO : null;

  const defaultQuickAddListId = useMemo(() => {
    if (activeListId) return activeListId;
    if (view === "inbox") return inboxListId(lists);
    return inboxListId(lists);
  }, [activeListId, view, lists]);

  const emptyMessage = useMemo(() => {
    if (typeof view === "object") {
      const list = lists.find((l) => l.id === view.listId);
      return listEmptyMessage(list?.slug ?? null);
    }
    return smartViewEmptyMessage(view);
  }, [view, lists]);

  const todaySections = useMemo(() => {
    if (view !== "today") return null;
    const parts = partitionTodayItems(visible, todayISO);
    return [
      {
        key: "overdue",
        title: "Overdue",
        description: "Carryover from earlier — finish when you can.",
        items: parts.overdue,
      },
      {
        key: "today",
        title: "Due today",
        items: parts.today,
      },
      {
        key: "pinned",
        title: "Pinned for today",
        items: parts.pinned,
      },
      {
        key: "done",
        title: "Completed today",
        items: parts.done,
      },
    ];
  }, [view, visible, todayISO]);

  const backlogSections = useMemo(() => {
    if (view !== "backlog") return null;
    return partitionBacklogByList(visible, lists).map((section) => ({
      key: section.list?.id ?? "unassigned",
      title: section.list?.name ?? "No list",
      items: section.items,
    }));
  }, [view, visible, lists]);



  const onQuickAdd = async (payload: {
    title: string;
    listId: string | null;
    startDate: string | null;
    endDate: string | null;
    priority: TodoPriority;
    taskType: TodoTaskType | null;
    status: TodoStatus;
  }) => {
    if (!user?.id) return;

    const listId =
      payload.listId ??
      (activeListId && lists.find((l) => l.id === activeListId)?.slug !== "inbox" ? activeListId : null) ??
      inboxListId(lists);

    try {

      const sort = visible.length;

      const row = await createItem(user.id, {

        title: payload.title,

        list_id: listId,

        start_date: payload.startDate,

        end_date: payload.endDate ?? (view === "today" ? todayISO : null),

        task_type: payload.taskType,

        status: payload.status,

        priority: payload.priority,

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

      setItems((prev) =>

        prev.map((i) =>

          i.id === item.id

            ? {

                ...i,

                done,

                status: done ? "done" : i.status === "done" ? "not_started" : i.status,

                completed_at: done ? new Date().toISOString() : null,

              }

            : i,

        ),

      );

    } catch (err) {

      toast({ title: "Couldn't update", description: err instanceof Error ? err.message : "", variant: "destructive" });

    }

  };



  const onPin = async (item: TodoItemRow) => {

    if (!user?.id) return;

    try {

      const next = await togglePinForToday(user.id, item, todayISO);

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, pinned_for_date: next } : i)));

    } catch (err) {

      toast({ title: "Couldn't update pin", description: err instanceof Error ? err.message : "", variant: "destructive" });

    }

  };



  const onUpdateItem = async (item: TodoItemRow, patch: Partial<TodoItemRow>) => {

    if (!user?.id) return;

    try {

      await updateItem(user.id, item.id, patch);

      setItems((prev) =>

        prev.map((i) => {

          if (i.id !== item.id) return i;

          const next = { ...i, ...patch };

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

          return next;

        }),

      );

    } catch (err) {

      toast({

        title: "Couldn't save",

        description: err instanceof Error ? err.message : "Try again.",

        variant: "destructive",

      });

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



  const onCreateList = async () => {

    if (!user?.id || !newListName.trim()) return;

    setCreatingList(true);

    try {

      const row = await createList(user.id, newListName.trim(), lists.length);

      setLists((prev) => [...prev, row]);

      setView({ listId: row.id });

      setNewListName("");

      setNewListOpen(false);

    } catch (err) {

      toast({ title: "Couldn't create list", description: err instanceof Error ? err.message : "", variant: "destructive" });

    } finally {

      setCreatingList(false);

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

  const subtitle = viewSubtitle(view, lists);

  return (
    <div

      className={hubShellPageRoot(

        showHubShell,

        "min-h-[100dvh] bg-background flex flex-col md:flex-row pb-[max(5rem,env(safe-area-inset-bottom))]",

        "bg-background flex flex-col md:flex-row min-h-0 h-full overflow-hidden",

      )}

    >

      <TodosSidebar
        showHubShell={showHubShell}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        view={view}
        onViewChange={setView}
        counts={counts}
        folderLists={folderLists}
        customLists={userCustomLists}
        onNewList={() => setNewListOpen(true)}
      />

      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col min-w-0 w-full",
          todoMainWidthClass(layoutMode, contentWidth),
        )}
      >
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              {sidebarCollapsed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex h-9 w-9 shrink-0 mt-0.5"
                  onClick={toggleSidebar}
                  aria-label="Expand tasks sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight">{viewLabel(view, lists)}</h2>

              <p className="text-sm text-muted-foreground mt-0.5">
                {visible.length} {visible.length === 1 ? "task" : "tasks"}
                {subtitle ? <span className="hidden sm:inline"> · {subtitle}</span> : null}
                <span className="hidden sm:inline"> · Press N to add</span>
              </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {layoutMode === "table" && (
                <ToggleGroup
                  type="single"
                  value={contentWidth}
                  onValueChange={(v) => {
                    if (v === "comfortable" || v === "wide" || v === "full") {
                      setContentWidth(v);
                    }
                  }}
                  className="hidden md:flex"
                >
                  <ToggleGroupItem
                    value="comfortable"
                    aria-label="Comfortable table width"
                    className="gap-1.5 px-2.5 h-9"
                  >
                    <GalleryHorizontal className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs">Fit</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="wide"
                    aria-label="Wide table width"
                    className="gap-1.5 px-2.5 h-9"
                  >
                    <StretchHorizontal className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs">Wide</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="full"
                    aria-label="Full table width"
                    className="gap-1.5 px-2.5 h-9"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs">Full</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              )}

              <ToggleGroup

                type="single"

                value={layoutMode}

                onValueChange={(v) => {

                  if (v === "list" || v === "table") {

                    setLayoutMode(v);

                    writeTodoViewMode(v);

                  }

                }}

              >

                <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-2.5 h-9">

                  <LayoutList className="w-4 h-4" />

                  <span className="hidden sm:inline text-xs">List</span>

                </ToggleGroupItem>

                <ToggleGroupItem value="table" aria-label="Table view" className="gap-1.5 px-2.5 h-9">

                  <Table2 className="w-4 h-4" />

                  <span className="hidden sm:inline text-xs">Table</span>

                </ToggleGroupItem>

              </ToggleGroup>

              <div className="min-w-[10rem]">

              <Label className="text-xs text-muted-foreground">Filter by type</Label>

              <Select

                value={typeFilter ?? "__all"}

                onValueChange={(v) => setTypeFilter(v === "__all" ? null : (v as TodoTaskType))}

              >

                <SelectTrigger className="mt-1 h-9">

                  <SelectValue placeholder="All types" />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="__all">All types</SelectItem>

                  {TASK_TYPES.map((t) => (

                    <SelectItem key={t} value={t}>

                      {TASK_TYPE_LABELS[t]}

                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

              </div>

            </div>

          </div>

        </header>



        <div
          className={cn(
            "flex-1 py-3 overflow-y-auto",
            layoutMode === "table" ? todoContentAreaClass(contentWidth) : "px-4",
            layoutMode === "list" ? "space-y-2" : "",
          )}
        >

          {busy && items.length === 0 && !loadError ? (

            <div className="flex justify-center py-16 text-muted-foreground gap-2 items-center">

              <Loader2 className="w-5 h-5 animate-spin" />

              Loading…

            </div>

          ) : loadError ? (

            <div className="text-center py-16 px-6">

              <p className="text-[15px] font-semibold">Couldn&apos;t load tasks</p>

              <p className="text-sm text-muted-foreground mt-1 mb-3">{loadError}</p>

              <button

                type="button"

                onClick={() => void load()}

                className="text-primary text-sm font-medium"

              >

                Try again

              </button>

            </div>

          ) : visible.length === 0 ? (

            <p className="text-center text-muted-foreground py-16 text-sm max-w-md mx-auto">

              {emptyMessage}

            </p>

          ) : layoutMode === "table" ? (

            <TodoTableView
              items={visible}
              todayISO={todayISO}
              contentWidth={contentWidth}
              onToggle={onToggle}
              onOpen={(item) => void openDetail(item)}
              onUpdate={onUpdateItem}
            />

          ) : view === "today" && todaySections ? (

            <TodoSectionedList
              sections={todaySections}
              subtaskCounts={subtaskCounts}
              onToggle={onToggle}
              onOpen={(item) => void openDetail(item)}
              onPin={(item) => void onPin(item)}
              onReorder={onReorder}
              draggable
            />

          ) : view === "backlog" && backlogSections ? (

            <TodoSectionedList
              sections={backlogSections}
              subtaskCounts={subtaskCounts}
              onToggle={onToggle}
              onOpen={(item) => void openDetail(item)}
              onPin={(item) => void onPin(item)}
              onReorder={onReorder}
              draggable
              emphasizePriority
            />

          ) : (

            visible.map((item) => (
              <TodoItemRowComponent
                key={item.id}
                item={item}
                onToggle={(done) => onToggle(item, done)}
                onOpen={() => void openDetail(item)}
                onPin={() => void onPin(item)}
                onReorder={onReorder}
                draggable={view !== "done"}
                subtaskCount={subtaskCounts[item.id] ?? 0}
              />
            ))

          )}

        </div>



        {view !== "done" && (

          <TodoQuickAdd
            inputRef={quickRef}
            lists={lists}
            defaultListId={defaultQuickAddListId}
            showListPicker={view === "inbox" || view === "all" || view === "backlog"}
            defaultEndDate={defaultEndForView}
            defaultTaskType={typeFilter}
            onSubmit={onQuickAdd}
          />

        )}

      </main>



      <TodoDetailSheet

        open={!!detailItem}

        userId={user?.id}

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



      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>

        <DialogContent className="max-w-sm">

          <DialogHeader>

            <DialogTitle>New list</DialogTitle>

          </DialogHeader>

          <div>

            <Label htmlFor="new-list-name">Name</Label>

            <Input

              id="new-list-name"

              value={newListName}

              onChange={(e) => setNewListName(e.target.value)}

              placeholder="e.g. Home projects"

              className="mt-1"

              onKeyDown={(e) => {

                if (e.key === "Enter") void onCreateList();

              }}

            />

          </div>

          <DialogFooter>

            <Button variant="outline" onClick={() => setNewListOpen(false)}>

              Cancel

            </Button>

            <Button onClick={() => void onCreateList()} disabled={!newListName.trim() || creatingList}>

              {creatingList ? "Creating…" : "Create"}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>

  );

}