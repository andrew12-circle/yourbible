import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { localDateISO } from "@/lib/habits/dates";
import type { TodoItemRow, TodoListRow, TodoPriority, TodoStatus, TodoTaskType } from "@/lib/todos/api";
import {
  PRIORITY_LABELS,
  remainingDays,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPES,
} from "@/lib/todos/api";
import { prependTimestampedNoteBlock } from "@/lib/todos/notes";

type Props = {
  open: boolean;
  userId?: string;
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
  userId,
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
  const [dictInterim, setDictInterim] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [taskType, setTaskType] = useState<TodoTaskType | "">("");
  const [status, setStatus] = useState<TodoStatus>("not_started");
  const [priority, setPriority] = useState<TodoPriority>(0);
  const [listId, setListId] = useState<string>("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const notesRef = useRef(notes);
  const savedNotesRef = useRef<string | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const voiceStampedRef = useRef(false);
  const todayISO = useMemo(() => localDateISO(), []);

  notesRef.current = notes;
  const displayNotes = mergeDictatedText(notes, dictInterim);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setNotes(item.notes ?? "");
    savedNotesRef.current = item.notes?.trim() || null;
    setStartDate(item.start_date ?? "");
    setEndDate(item.end_date ?? item.due_date ?? "");
    setTaskType(item.task_type ?? "");
    setStatus(item.status ?? (item.done ? "done" : "not_started"));
    setPriority(item.priority as TodoPriority);
    setListId(item.list_id ?? "");
    setDictInterim("");
    voiceStampedRef.current = false;
  }, [item]);

  const daysLeft = useMemo(
    () => remainingDays(endDate || null, todayISO),
    [endDate, todayISO],
  );

  const persist = useCallback(async (patch: Partial<TodoItemRow>) => {
    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const persistNotesIfChanged = useCallback(async () => {
    const trimmed = notesRef.current.trim() || null;
    if (trimmed === savedNotesRef.current) return;
    await persist({ notes: trimmed });
    savedNotesRef.current = trimmed;
  }, [persist]);

  useEffect(() => {
    if (!item) return;
    const trimmed = notes.trim() || null;
    if (trimmed === savedNotesRef.current) return;
    const timer = setTimeout(() => void persistNotesIfChanged(), 600);
    return () => clearTimeout(timer);
  }, [notes, item, persistNotesIfChanged]);

  const ensureVoiceTimestamp = useCallback((prev: string) => {
    if (voiceStampedRef.current) return prev;
    voiceStampedRef.current = true;
    return prependTimestampedNoteBlock(prev);
  }, []);

  const handleDictateAppend = useCallback(
    (chunk: string) => {
      setNotes((prev) => {
        const stamped = ensureVoiceTimestamp(prev);
        const next = mergeDictatedText(stamped, chunk);
        notesRef.current = next;
        return next;
      });
      setDictInterim("");
    },
    [ensureVoiceTimestamp],
  );

  const handleDictationListeningChange = useCallback(
    (listening: boolean) => {
      if (listening) {
        setNotes((prev) => {
          const next = ensureVoiceTimestamp(prev);
          notesRef.current = next;
          return next;
        });
        return;
      }
      voiceStampedRef.current = false;
      setDictInterim("");
    },
    [ensureVoiceTimestamp],
  );

  const handleClose = useCallback(() => {
    dictateRef.current?.stop();
    setDictInterim("");
    void persistNotesIfChanged().finally(() => onClose());
  }, [persistNotesIfChanged, onClose]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Task details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== item.title && persist({ title: title.trim() })}
            className="text-lg font-medium border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Task title"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={taskType || "__none"}
                onValueChange={(v) => {
                  const next = v === "__none" ? null : (v as TodoTaskType);
                  setTaskType(next ?? "");
                  void persist({ task_type: next });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  void persist({ start_date: e.target.value || null });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  void persist({ end_date: e.target.value || null, due_date: e.target.value || null });
                }}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Remaining days</Label>
              <p
                className={`mt-2 text-sm font-medium tabular-nums ${
                  daysLeft != null && daysLeft < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                }`}
              >
                {daysLeft == null
                  ? "—"
                  : daysLeft < 0
                    ? `Past Due (${Math.abs(daysLeft)}d)`
                    : daysLeft === 0
                      ? "Due today"
                      : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  const next = v as TodoStatus;
                  setStatus(next);
                  void persist({ status: next });
                }}
              >
                <SelectTrigger className="mt-1">
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
            <div className="relative mt-1">
              <Textarea
                value={displayNotes}
                onChange={(e) => {
                  setDictInterim("");
                  setNotes(e.target.value);
                  notesRef.current = e.target.value;
                }}
                onBlur={(e) => {
                  notesRef.current = e.target.value;
                  void persistNotesIfChanged();
                }}
                placeholder="Add notes…"
                className="min-h-[88px] resize-none pr-10"
              />
              <div className="absolute right-1 top-1">
                <DictateButton
                  ref={dictateRef}
                  userId={userId}
                  webSpeechOnly
                  size="sm"
                  className="h-8 w-8 rounded-md"
                  onAppend={handleDictateAppend}
                  onInterim={setDictInterim}
                  onListeningChange={handleDictationListeningChange}
                />
              </div>
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
