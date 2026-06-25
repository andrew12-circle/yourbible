import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  effectiveEndDate,
  isPinnedToday,
  PRIORITY_LABELS,
  remainingDays,
  STATUS_LABELS,
  TASK_TYPE_BORDER_COLORS,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  type TodoItemRow,
  type TodoPriority,
  type TodoStatus,
  type TodoTaskType,
} from "@/lib/todos/api";
import { isRowMuted, priorityCellClass } from "@/lib/todos/tableHelpers";
import type { TodoContentWidth } from "@/lib/todos/layoutPrefs";

type Props = {
  items: TodoItemRow[];
  todayISO: string;
  contentWidth?: TodoContentWidth;
  onToggle: (item: TodoItemRow, done: boolean) => void;
  onOpen: (item: TodoItemRow) => void;
  onUpdate: (item: TodoItemRow, patch: Partial<TodoItemRow>) => Promise<void>;
};

const PRIORITIES: TodoPriority[] = [0, 1, 2, 3];
const STATUSES = Object.keys(STATUS_LABELS) as TodoStatus[];

export default function TodoTableView({
  items,
  todayISO,
  contentWidth = "comfortable",
  onToggle,
  onOpen,
  onUpdate,
}: Props) {
  return (
    <div
      className={cn(
        "overflow-x-auto w-full",
        contentWidth === "comfortable" && "-mx-4 px-4",
        contentWidth === "wide" && "-mx-2 px-2",
      )}
    >
      <Table
        className={cn(
          "w-full border-collapse text-sm",
          contentWidth !== "full" && "min-w-[1024px]",
        )}
      >
        <TableHeader>
          <TableRow className="bg-yellow-300 hover:bg-yellow-300 border-b border-yellow-500/40">
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap min-w-[180px]">
              Task Name
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap w-[130px]">
              Type
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap w-[130px]">
              Priority
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap w-[120px]">
              Start Date
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap w-[120px]">
              End Date
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap w-[110px]">
              Remaining Days
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold whitespace-nowrap w-[120px]">
              Status
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold min-w-[140px]">
              Notes
            </TableHead>
            <TableHead className="sticky top-0 z-[1] bg-yellow-300 text-yellow-950 font-semibold w-12 text-center">
              Done
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => {
            const muted = isRowMuted(item);
            const pinned = isPinnedToday(item, todayISO);
            const endDate = effectiveEndDate(item);
            const days = remainingDays(endDate, todayISO);
            const typeBorder =
              item.task_type != null
                ? `border-l-4 ${TASK_TYPE_BORDER_COLORS[item.task_type]}`
                : "border-l-4 border-l-zinc-300 dark:border-l-zinc-600";

            return (
              <TableRow
                key={item.id}
                className={cn(
                  typeBorder,
                  idx % 2 === 0 ? "bg-background" : "bg-muted/30",
                  pinned && "bg-yellow-100/80 dark:bg-yellow-950/30",
                  muted && "opacity-70",
                )}
              >
                <TableCell className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className={cn(
                      "text-left font-medium hover:underline underline-offset-2 truncate block",
                      contentWidth === "full" ? "max-w-none" : "max-w-[280px]",
                      muted && "line-through text-muted-foreground",
                    )}
                  >
                    {item.title}
                  </button>
                </TableCell>

                <TableCell className="py-1.5 px-2">
                  <Select
                    value={item.task_type ?? "__none"}
                    onValueChange={(v) =>
                      void onUpdate(item, {
                        task_type: v === "__none" ? null : (v as TodoTaskType),
                      })
                    }
                  >
                    <SelectTrigger className="h-8 border-0 bg-transparent shadow-none focus:ring-1 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {TASK_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TASK_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className={cn("py-1.5 px-2", priorityCellClass(item.priority))}>
                  <Select
                    value={String(item.priority)}
                    onValueChange={(v) =>
                      void onUpdate(item, { priority: Number(v) as TodoPriority })
                    }
                  >
                    <SelectTrigger className="h-8 border-0 bg-transparent shadow-none focus:ring-1 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="py-1.5 px-2">
                  <input
                    type="date"
                    value={item.start_date ?? ""}
                    onChange={(e) =>
                      void onUpdate(item, { start_date: e.target.value || null })
                    }
                    className="h-8 w-full min-w-[7.5rem] rounded-md border-0 bg-transparent px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Start date"
                  />
                </TableCell>

                <TableCell className="py-1.5 px-2">
                  <input
                    type="date"
                    value={endDate ?? ""}
                    onChange={(e) => {
                      const next = e.target.value || null;
                      void onUpdate(item, { end_date: next, due_date: next });
                    }}
                    className="h-8 w-full min-w-[7.5rem] rounded-md border-0 bg-transparent px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="End date"
                  />
                </TableCell>

                <TableCell className="py-2 px-3 tabular-nums text-xs whitespace-nowrap">
                  {days === null ? (
                    "—"
                  ) : days < 0 ? (
                    <span className="text-red-600 dark:text-red-400 font-semibold">Past Due</span>
                  ) : (
                    days
                  )}
                </TableCell>

                <TableCell className="py-1.5 px-2">
                  <Select
                    value={item.status}
                    onValueChange={(v) => void onUpdate(item, { status: v as TodoStatus })}
                  >
                    <SelectTrigger className="h-8 border-0 bg-transparent shadow-none focus:ring-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell
                  className={cn(
                    "py-2 px-3 text-xs text-muted-foreground",
                    contentWidth === "full" ? "max-w-none" : "max-w-[200px]",
                  )}
                >
                  <span className="line-clamp-2" title={item.notes ?? undefined}>
                    {item.notes?.trim() || "—"}
                  </span>
                </TableCell>

                <TableCell className="py-2 px-3 text-center">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) => onToggle(item, checked === true)}
                    aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
