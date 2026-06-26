import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/appBrand";
import { formatBirthDatePoster } from "@/lib/lifeWeeks";
import { useLifeWeekColorMap } from "@/hooks/useLifeWeekColorMap";
import { lifeWeekColorAt } from "@/lib/lifeWeekCellColors";
import {
  BLINK_AXIS_FONT,
  BLINK_CELL,
  BLINK_GRID_H,
  BLINK_GRID_W,
  BLINK_MARGIN_LEFT,
  BLINK_MARGIN_TOP,
  BLINK_TICK_FONT,
  BLINK_WEEKS_PER_YEAR,
  BLINK_WEEKS_TOTAL,
  BLINK_YEAR_TICKS,
  BLINK_YEAR_TICK_Y,
  BLINK_YEARS_LABEL_Y,
  BLINK_WEEK_TICKS,
  blinkColX,
  blinkGridHeightPx,
  blinkGridWidthPx,
  blinkRowY,
  blinkWeekIndexToPos,
  blinkYearTickX,
} from "@/lib/blinkOfAnEyeGrid";

type BlinkOfAnEyeChartProps = {
  birthDate: string;
  currentWeekIndex: number;
  personName?: string;
  closedWeekIndices?: ReadonlySet<number>;
  className?: string;
};

function FlyingBirds({ x, y }: { x: number; y: number }) {
  const paths = [
    "M0 0c2-1 4-1 6 0 2 1 4 1 6 0",
    "M14 6c2-1 4-1 6 0 2 1 4 1 6 0",
    "M28 12c2-1 4-1 6 0 2 1 4 1 6 0",
  ];
  return (
    <g transform={`translate(${x}, ${y})`} opacity={0.65} aria-hidden>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          className="stroke-zinc-400"
          strokeWidth={1}
          strokeLinecap="round"
          transform={`translate(${i * 8}, ${i * 4}) scale(0.65)`}
        />
      ))}
    </g>
  );
}

export function BlinkOfAnEyeChart({
  birthDate,
  currentWeekIndex,
  personName,
  closedWeekIndices,
  className,
}: BlinkOfAnEyeChartProps) {
  const gridW = blinkGridWidthPx();
  const gridH = blinkGridHeightPx();
  const subtitle = formatBirthDatePoster(birthDate);
  const cappedWeekIndex = Math.min(currentWeekIndex, BLINK_WEEKS_TOTAL - 1);
  const pastBlinkSpan = currentWeekIndex >= BLINK_WEEKS_TOTAL;
  const colorMap = useLifeWeekColorMap({
    birthDate,
    totalCells: BLINK_WEEKS_TOTAL,
    cols: BLINK_WEEKS_PER_YEAR,
    scope: "blink",
  });

  const ariaTitle = personName
    ? `The Blink of an Eye, ${personName}, born ${subtitle}`
    : `The Blink of an Eye, born ${subtitle}`;

  return (
    <div className={cn("flex min-h-0 flex-1 items-center justify-center overflow-hidden", className)}>
      <svg
        role="img"
        aria-label={ariaTitle}
        viewBox={`0 0 ${BLINK_GRID_W} ${BLINK_GRID_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full max-h-full w-full overflow-visible text-zinc-900 dark:text-zinc-100"
      >
        <title>{ariaTitle}</title>

        <text
          x={2}
          y={BLINK_YEARS_LABEL_Y}
          textAnchor="start"
          className="fill-muted-foreground"
          style={{ fontSize: BLINK_AXIS_FONT }}
        >
          Years
        </text>

        <text
          x={2}
          y={BLINK_MARGIN_TOP + gridH / 2}
          textAnchor="middle"
          transform={`rotate(-90 2 ${BLINK_MARGIN_TOP + gridH / 2})`}
          className="fill-muted-foreground"
          style={{ fontSize: BLINK_AXIS_FONT }}
        >
          Weeks
        </text>

        {BLINK_YEAR_TICKS.map((year) => {
          const x = BLINK_MARGIN_LEFT + blinkYearTickX(year);
          return (
            <text
              key={`y-${year}`}
              x={x}
              y={BLINK_YEAR_TICK_Y}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: BLINK_TICK_FONT }}
            >
              {year}
            </text>
          );
        })}

        {BLINK_WEEK_TICKS.map((week) => {
          const capped = Math.min(week, BLINK_WEEKS_PER_YEAR - 1);
          const y = BLINK_MARGIN_TOP + blinkRowY(capped) + BLINK_CELL / 2;
          return (
            <text
              key={`w-${week}`}
              x={BLINK_MARGIN_LEFT - 3}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: BLINK_TICK_FONT }}
            >
              {week}
            </text>
          );
        })}

        {Array.from({ length: BLINK_WEEKS_TOTAL }, (_, i) => {
          const { year, week } = blinkWeekIndexToPos(i);
          const x = BLINK_MARGIN_LEFT + blinkColX(year);
          const y = BLINK_MARGIN_TOP + blinkRowY(week);
          const isPast = pastBlinkSpan || i < currentWeekIndex;
          const isCurrent = !pastBlinkSpan && i === cappedWeekIndex;
          const isFuture = !pastBlinkSpan && i > currentWeekIndex;
          const isClosed = isPast && (closedWeekIndices?.has(i) ?? false);
          const fill = colorMap ? lifeWeekColorAt(colorMap, i) : undefined;

          return (
            <g key={i}>
              {isPast && (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={BLINK_CELL}
                    height={BLINK_CELL}
                    fill={fill}
                    className={fill ? undefined : "fill-current"}
                    rx={0.5}
                  />
                  {isClosed ? (
                    <path
                      d={`M ${x + 1.5} ${y + BLINK_CELL * 0.55} L ${x + BLINK_CELL * 0.42} ${y + BLINK_CELL - 1.5} L ${x + BLINK_CELL - 1.5} ${y + 1.5}`}
                      fill="none"
                      className="stroke-white"
                      strokeWidth={1.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </>
              )}
              {isFuture && (
                <rect
                  x={x + 0.35}
                  y={y + 0.35}
                  width={BLINK_CELL - 0.7}
                  height={BLINK_CELL - 0.7}
                  fill="none"
                  className="stroke-zinc-300 dark:stroke-zinc-600"
                  strokeWidth={0.5}
                  rx={0.5}
                />
              )}
              {isCurrent && (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={BLINK_CELL}
                    height={BLINK_CELL}
                    fill={fill}
                    className={fill ? undefined : "fill-current"}
                    rx={0.5}
                  />
                  <rect
                    x={x - 1}
                    y={y - 1}
                    width={BLINK_CELL + 2}
                    height={BLINK_CELL + 2}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth={1}
                    rx={0.75}
                  />
                </>
              )}
            </g>
          );
        })}

        <FlyingBirds x={BLINK_MARGIN_LEFT + gridW - 6} y={BLINK_MARGIN_TOP + gridH + 1} />

        <text
          x={BLINK_GRID_W / 2}
          y={BLINK_GRID_H - 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 5, letterSpacing: "0.14em" }}
        >
          {`${BLINK_WEEKS_TOTAL.toLocaleString()} weeks · ${APP_NAME}`}
        </text>
      </svg>
    </div>
  );
}
