import { useMemo, useRef, useState } from "react";
import { Calendar, GripVertical, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { localDateISO } from "@/lib/habits/dates";
import type { TodoItemRow, TodoPriority } from "@/lib/todos/api";
import {
  effectiveEndDate,
  isPinnedToday,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  remainingDays,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  TASK_TYPE_BORDER_COLORS,
  TASK_TYPE_LABELS,
  type TodoTaskType,
} from "@/lib/todos/api";
import { notesPreview } from "@/lib/todos/tableHelpers";

type Props = {
  item: TodoItemRow;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  onPin?: () => void;
  onReorder?: (fromId: string, toId: string) => void;
  draggable?: boolean;
  subtaskCount?: number;
  emphasizePriority?: boolean;
};

export default function TodoItemRowComponent({
  item,
  onToggle,
  onOpen,
  onPin,
  onReorder,
  draggable = true,
  subtaskCount = 0,
  emphasizePriority = false,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const todayISO = useMemo(() => localDateISO(), []);

  const pinned = isPinnedToday(item, todayISO);
  const endDate = effectiveEndDate(item);
  const daysLeft = remainingDays(endDate, todayISO);
  const status = item.status ?? (item.done ? "done" : "not_started");

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      setSwiping(false);
      setSwipeX(0);
      return;
    }
    if (dx > 0) setSwipeX(Math.min(dx, 96));
  };

  const onTouchEnd = () => {
    if (swipeX > 64 && !item.done) onToggle(true);
    setSwipeX(0);
    setSwiping(false);
    touchStart.current = null;
  };

  const dueLabel =
    endDate &&
    new Date(endDate + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const typeBorder =
    item.task_type != null
      ? TASK_TYPE_BORDER_COLORS[item.task_type as TodoTaskType]
      : "border-l-transparent";
  const noteSnippet = notesPreview(item.notes);

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-l-4 bg-card transition-shadow",
        typeBorder,
        dragOver && "ring-2 ring-primary/30",
        pinned && "bg-yellow-100/80 dark:bg-yellow-950/40",
        item.done && "opacity-60",
      )}
    >
      {swipeX > 8 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center px-4 rounded-l-xl bg-emerald-500 text-white text-sm font-medium"
          style={{ width: swipeX }}
        >
          Done
        </div>
      )}
      <div
        draggable={draggable && !item.done}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", item.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const fromId = e.dataTransfer.getData("text/plain");
          if (fromId && fromId !== item.id) onReorder?.(fromId, item.id);
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: swipeX ? `translateX(${swipeX}px)` : undefined }}
        className={cn(
          "flex items-center gap-2 px-3 py-3 touch-pan-y",
          swiping && "transition-none",
          !swiping && "transition-transform duration-150",
        )}
      >
        {draggable && (
          <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
        )}
        <button
          type="button"
          onClick={() => onToggle(!item.done)}
          className={cn(
            "shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition",
            item.done
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/35 hover:border-primary",
          )}
          aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        >
          {item.done && (
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6l3 3 5-6" />
            </svg>
          )}
        </button>
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left">
          <p className={cn("text-[15px] leading-snug truncate", item.done && "line-through text-muted-foreground")}>
            {item.title}
          </p>
          {noteSnippet && (
            <p className="text-xs text-muted-foreground truncate mt-0.5" title={item.notes?.trim()}>
              {noteSnippet}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {item.task_type && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {TASK_TYPE_LABELS[item.task_type]}
              </span>
            )}
            {status !== "not_started" && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                  STATUS_BADGE_CLASSES[status],
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            )}
            {item.priority > 0 &&
              (emphasizePriority ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <span
                    className={cn("w-2 h-2 rounded-full shrink-0", PRIORITY_COLORS[item.priority as TodoPriority])}
                  />
                  {PRIORITY_LABELS[item.priority as TodoPriority]}
                </span>
              ) : (
                <span
                  className={cn("w-2 h-2 rounded-full", PRIORITY_COLORS[item.priority as TodoPriority])}
                  title={PRIORITY_LABELS[item.priority as TodoPriority]}
                />
              ))}
            {daysLeft != null && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  daysLeft < 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground",
                )}
              >
                {daysLeft < 0 ? `Past Due (${Math.abs(daysLeft)}d)` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
              </span>
            )}
            {dueLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {dueLabel}
              </span>
            )}
            {subtaskCount > 0 && <span className="text-xs text-muted-foreground">{subtaskCount} subtasks</span>}
          </div>
        </button>
        {onPin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={cn(
              "shrink-0 p-1.5 rounded-lg transition",
              pinned ? "text-amber-600 bg-amber-100 dark:bg-amber-950" : "text-muted-foreground/50 hover:text-amber-600 hover:bg-secondary",
            )}
            aria-label={pinned ? "Unpin from today" : "Pin for today"}
          >
            <Pin className={cn("w-4 h-4", pinned && "fill-current")} />
          </button>
        )}
      </div>
    </div>
  );
}
