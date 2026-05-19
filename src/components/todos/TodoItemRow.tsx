import { useRef, useState } from "react";
import { Calendar, GripVertical, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItemRow, TodoPriority } from "@/lib/todos/api";
import { PRIORITY_COLORS } from "@/lib/todos/api";

type Props = {
  item: TodoItemRow;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  onReorder?: (fromId: string, toId: string) => void;
  draggable?: boolean;
  subtaskCount?: number;
};

export default function TodoItemRowComponent({
  item,
  onToggle,
  onOpen,
  onReorder,
  draggable = true,
  subtaskCount = 0,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);

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
    item.due_date &&
    new Date(item.due_date + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card transition-shadow",
        dragOver && "ring-2 ring-primary/30",
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
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {item.priority > 0 && (
              <span
                className={cn("w-2 h-2 rounded-full", PRIORITY_COLORS[item.priority as TodoPriority])}
                title={`Priority ${item.priority}`}
              />
            )}
            {dueLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {dueLabel}
              </span>
            )}
            {item.notes && <StickyNote className="w-3 h-3 text-muted-foreground/70" aria-label="Has notes" />}
            {subtaskCount > 0 && <span className="text-xs text-muted-foreground">{subtaskCount} subtasks</span>}
          </div>
        </button>
      </div>
    </div>
  );
}
