import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TodoPriority, TodoStatus, TodoTaskType } from "@/lib/todos/api";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_TYPE_LABELS, TASK_TYPES } from "@/lib/todos/api";

export type QuickAddPayload = {
  title: string;
  startDate: string | null;
  endDate: string | null;
  priority: TodoPriority;
  taskType: TodoTaskType | null;
  status: TodoStatus;
};

type Props = {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  defaultEndDate?: string | null;
  defaultTaskType?: TodoTaskType | null;
  onSubmit: (payload: QuickAddPayload) => Promise<void>;
};

export default function TodoQuickAdd({
  inputRef,
  defaultEndDate = null,
  defaultTaskType = "work",
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(defaultEndDate ?? "");
  const [priority, setPriority] = useState<TodoPriority>(0);
  const [taskType, setTaskType] = useState<TodoTaskType | "">(defaultTaskType ?? "");
  const [status, setStatus] = useState<TodoStatus>("not_started");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEndDate(defaultEndDate ?? "");
  }, [defaultEndDate]);

  useEffect(() => {
    if (defaultTaskType) setTaskType(defaultTaskType);
  }, [defaultTaskType]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit({
        title: trimmed,
        startDate: startDate || null,
        endDate: endDate || null,
        priority,
        taskType: taskType || null,
        status,
      });
      setTitle("");
      setStartDate("");
      setPriority(0);
      setStatus("not_started");
      if (defaultTaskType) setTaskType(defaultTaskType);
      else setTaskType("");
      if (defaultEndDate) setEndDate(defaultEndDate);
      else setEndDate("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="w-full space-y-2.5">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task…"
            className="rounded-xl h-11 bg-secondary/50 border-0 flex-1"
            aria-label="New task"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            disabled={!title.trim() || busy}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 xl:grid-cols-5">
          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={taskType || "__none"}
              onValueChange={(v) => setTaskType(v === "__none" ? "" : (v as TodoTaskType))}
            >
              <SelectTrigger className="mt-1 h-9 px-2 text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TASK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select
              value={String(priority)}
              onValueChange={(v) => setPriority(Number(v) as TodoPriority)}
            >
              <SelectTrigger className="mt-1 h-9 px-2 text-sm">
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

          <div className="min-w-0 col-span-2 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TodoStatus)}>
              <SelectTrigger className="mt-1 h-9 px-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as TodoStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label htmlFor="todo-quick-start" className="text-xs text-muted-foreground">
              Start
            </Label>
            <Input
              id="todo-quick-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 h-9 min-w-[8.75rem] px-2 text-sm"
            />
          </div>

          <div className="min-w-0">
            <Label htmlFor="todo-quick-end" className="text-xs text-muted-foreground">
              End
            </Label>
            <Input
              id="todo-quick-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 h-9 min-w-[8.75rem] px-2 text-sm"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
