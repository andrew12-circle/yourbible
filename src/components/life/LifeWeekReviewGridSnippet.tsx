import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LIFE_WEEKS_TOTAL } from "@/lib/lifeWeeks";
import { lifeWeekColorAt } from "@/lib/lifeWeekCellColors";
import { useLifeWeekColorMap } from "@/hooks/useLifeWeekColorMap";
import {
  CELL,
  GRID_COLS,
  GRID_ROWS,
  MARGIN_LEFT,
  MARGIN_TOP,
  colX,
  reviewSnippetViewBox,
  rowY,
  weekIndexToGridPos,
} from "@/lib/lifeWeeksGrid";

type Props = {
  weekIndex: number;
  currentWeekIndex: number;
  checked: boolean;
  onToggle: () => void;
};

function weekIndicesInWindow(weekIndex: number): number[] {
  const { row, col } = weekIndexToGridPos(weekIndex);
  const padRows = 2;
  const padCols = 8;
  const minRow = Math.max(0, row - padRows);
  const maxRow = Math.min(GRID_ROWS - 1, row + padRows);
  const minCol = Math.max(0, col - padCols);
  const maxCol = Math.min(GRID_COLS - 1, col + padCols);
  const indices: number[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      indices.push(r * GRID_COLS + c);
    }
  }
  return indices;
}

export function LifeWeekReviewGridSnippet({ weekIndex, currentWeekIndex, checked, onToggle }: Props) {
  const { profile } = useAuth();
  const dobRaw = profile?.date_of_birth;
  const dob = dobRaw != null && String(dobRaw).trim() !== "" ? String(dobRaw).trim() : null;
  const colorMap = useLifeWeekColorMap({
    birthDate: dob,
    totalCells: LIFE_WEEKS_TOTAL,
    cols: GRID_COLS,
  });
  const viewBox = reviewSnippetViewBox(weekIndex);
  const cellIndices = weekIndicesInWindow(weekIndex);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {checked ? "Week marked on your life grid" : "Tap the highlighted square on your life grid"}
      </p>
      <svg
        role="img"
        aria-label={`Life weeks grid, week ${weekIndex + 1}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto w-full max-h-44 text-zinc-900 dark:text-zinc-100"
      >
        {cellIndices.map((i) => {
          const { row, col } = weekIndexToGridPos(i);
          const x = MARGIN_LEFT + colX(col);
          const y = MARGIN_TOP + rowY(row);
          const isTarget = i === weekIndex;
          const isPast = i < currentWeekIndex;
          const isCurrent = i === currentWeekIndex;
          const isFuture = i > currentWeekIndex;
          const fill = colorMap ? lifeWeekColorAt(colorMap, i) : undefined;

          if (isTarget) {
            return (
              <g
                key={i}
                role="button"
                tabIndex={checked ? -1 : 0}
                aria-label={
                  checked
                    ? `Week ${weekIndex + 1} checked off`
                    : `Check off week ${weekIndex + 1}`
                }
                aria-pressed={checked}
                className={cn(!checked && "cursor-pointer")}
                onClick={checked ? undefined : onToggle}
                onKeyDown={
                  checked
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onToggle();
                        }
                      }
                }
              >
                {!checked && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={CELL + 6}
                    height={CELL + 6}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={2}
                    rx={1.5}
                  >
                    <animate
                      attributeName="opacity"
                      values="1;0.35;1"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  fill={checked ? "#16A34A" : fill}
                  className={checked || fill ? undefined : "fill-current"}
                  rx={0.5}
                />
                {!checked ? (
                  <rect x={x} y={y} width={CELL} height={CELL} fill="transparent" />
                ) : null}
                {checked ? (
                  <path
                    d={`M ${x + 2} ${y + CELL * 0.55} L ${x + CELL * 0.42} ${y + CELL - 2} L ${x + CELL - 2} ${y + 2}`}
                    fill="none"
                    className="stroke-white"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </g>
            );
          }

          if (isPast) {
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                fill={fill}
                className={fill ? undefined : "fill-current opacity-40"}
                rx={0.5}
              />
            );
          }
          if (isFuture) {
            return (
              <rect
                key={i}
                x={x + 0.5}
                y={y + 0.5}
                width={CELL - 1}
                height={CELL - 1}
                fill="none"
                className="stroke-current stroke-[1] opacity-30"
                rx={0.5}
              />
            );
          }
          if (isCurrent) {
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  fill={fill}
                  className={fill ? undefined : "fill-current opacity-70"}
                  rx={0.5}
                />
                <rect
                  x={x - 1.5}
                  y={y - 1.5}
                  width={CELL + 3}
                  height={CELL + 3}
                  fill="none"
                  className="stroke-primary opacity-60"
                  strokeWidth={1.5}
                  rx={1}
                />
              </g>
            );
          }
          return null;
        })}
      </svg>
      <button
        type="button"
        onClick={onToggle}
        disabled={checked}
        aria-pressed={checked}
        aria-label={
          checked
            ? `Week ${weekIndex + 1} checked off on life grid`
            : `Check off week ${weekIndex + 1} on life grid`
        }
        className={cn(
          "mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
          checked
            ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
            : "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10",
        )}
      >
        {checked ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Week {weekIndex + 1} checked off
          </>
        ) : (
          <>Check off week {weekIndex + 1}</>
        )}
      </button>
    </div>
  );
}
