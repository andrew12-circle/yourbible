import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TodoItemRow, TodoListRow, TodoPriority } from "@/lib/todos/api";
import { PRIORITY_LABELS } from "@/lib/todos/api";

type Props = {
  open: boolean;
  item: TodoItemRow | null;
  lists: TodoListRow[];
  subtasks: TodoItemRow[];
  onClose: () => void;
  onSave: (patch: Partial<TodoItemRow>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (sub: TodoItemRow, done: boolean) => Promise<void>;
};

export default function TodoDetailSheet({
  open,
  item,
  lists,
  subtasks,
  onClose,
  onSave,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
}: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TodoPriority>(0);
  const [listId, setListId] = useState<string>("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setNotes(item.notes ?? "");
    setDueDate(item.due_date ?? "");
    setPriority(item.priority as TodoPriority);
    setListId(item.list_id ?? "");
  }, [item]);

  if (!item) return null;

  const persist = async (patch: Partial<TodoItemRow>) => {
    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="sr-only">Task details</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-8">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== item.title && persist({ title: title.trim() })}
            className="text-lg font-medium border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Task title"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Due</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  void persist({ due_date: e.target.value || null });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={String(priority)}
                onValueChange={(v) => {
                  const p = Number(v) as TodoPriority;
                  setPriority(p);
                  void persist({ priority: p });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([0, 1, 2, 3] as TodoPriority[]).map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">List</Label>
            <Select
              value={listId || "__none"}
              onValueChange={(v) => {
                const next = v === "__none" ? null : v;
                setListId(next ?? "");
                void persist({ list_id: next });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Inbox" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Inbox</SelectItem>
                {lists
                  .filter((l) => l.slug !== "inbox")
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => void persist({ notes: notes.trim() || null })}
              placeholder="Add notes…"
              className="mt-1 min-h-[88px] resize-none"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Subtasks</Label>
            <ul className="mt-2 space-y-2">
              {subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleSubtask(s, !s.done)}
                    className={`w-5 h-5 rounded-full border-2 shrink-0 ${s.done ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                    aria-label={s.done ? "Mark subtask incomplete" : "Mark subtask complete"}
                  />
                  <span className={s.done ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                    {s.title}
                  </span>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2 mt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const t = subtaskDraft.trim();
                if (!t) return;
                setSubtaskDraft("");
                await onAddSubtask(t);
              }}
            >
              <Input
                value={subtaskDraft}
                onChange={(e) => setSubtaskDraft(e.target.value)}
                placeholder="Add subtask"
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!subtaskDraft.trim()}>
                Add
              </Button>
            </form>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            disabled={saving}
            onClick={() => void onDelete()}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
