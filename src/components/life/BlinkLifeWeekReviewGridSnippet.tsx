import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { lifeWeekColorAt } from "@/lib/lifeWeekCellColors";
import { useLifeWeekColorMap } from "@/hooks/useLifeWeekColorMap";
import {
  BLINK_CELL,
  BLINK_MARGIN_LEFT,
  BLINK_MARGIN_TOP,
  BLINK_WEEKS_PER_YEAR,
  BLINK_WEEKS_TOTAL,
  blinkColX,
  blinkReviewSnippetViewBox,
  blinkRowY,
  blinkWeekIndexToPos,
  blinkWeekIndicesInReviewWindow,
} from "@/lib/blinkOfAnEyeGrid";

type Props = {
  birthDate: string;
  weekIndex: number;
  currentWeekIndex: number;
  checked: boolean;
  onToggle: () => void;
  personName: string;
};

export function BlinkLifeWeekReviewGridSnippet({
  birthDate,
  weekIndex,
  currentWeekIndex,
  checked,
  onToggle,
  personName,
}: Props) {
  const colorMap = useLifeWeekColorMap({
    birthDate,
    totalCells: BLINK_WEEKS_TOTAL,
    cols: BLINK_WEEKS_PER_YEAR,
    scope: "blink",
  });
  const viewBox = blinkReviewSnippetViewBox(weekIndex);
  const cellIndices = blinkWeekIndicesInReviewWindow(weekIndex);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {checked
          ? `Week marked on ${personName}'s Blink of an Eye grid`
          : `Tap the highlighted square on ${personName}'s grid`}
      </p>
      <svg
        role="img"
        aria-label={`Blink of an Eye grid, week ${weekIndex + 1}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto w-full max-h-44 text-zinc-900 dark:text-zinc-100"
      >
        {cellIndices.map((i) => {
          const { year, week } = blinkWeekIndexToPos(i);
          const x = BLINK_MARGIN_LEFT + blinkColX(year);
          const y = BLINK_MARGIN_TOP + blinkRowY(week);
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
                    x={x - 2}
                    y={y - 2}
                    width={BLINK_CELL + 4}
                    height={BLINK_CELL + 4}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={1.5}
                    rx={1}
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
                  width={BLINK_CELL}
                  height={BLINK_CELL}
                  fill={checked ? "#16A34A" : fill}
                  className={checked || fill ? undefined : "fill-current"}
                  rx={0.5}
                />
                {!checked ? (
                  <rect x={x} y={y} width={BLINK_CELL} height={BLINK_CELL} fill="transparent" />
                ) : null}
                {checked ? (
                  <path
                    d={`M ${x + 1.5} ${y + BLINK_CELL * 0.55} L ${x + BLINK_CELL * 0.42} ${y + BLINK_CELL - 1.5} L ${x + BLINK_CELL - 1.5} ${y + 1.5}`}
                    fill="none"
                    className="stroke-white"
                    strokeWidth={1.25}
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
                width={BLINK_CELL}
                height={BLINK_CELL}
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
                x={x + 0.35}
                y={y + 0.35}
                width={BLINK_CELL - 0.7}
                height={BLINK_CELL - 0.7}
                fill="none"
                className="stroke-current stroke-[0.75] opacity-30"
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
                  width={BLINK_CELL}
                  height={BLINK_CELL}
                  fill={fill}
                  className={fill ? undefined : "fill-current opacity-70"}
                  rx={0.5}
                />
                <rect
                  x={x - 1}
                  y={y - 1}
                  width={BLINK_CELL + 2}
                  height={BLINK_CELL + 2}
                  fill="none"
                  className="stroke-primary opacity-60"
                  strokeWidth={1}
                  rx={0.75}
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
            ? `Week ${weekIndex + 1} checked off on ${personName}'s grid`
            : `Check off week ${weekIndex + 1} on ${personName}'s grid`
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
