import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/appBrand";
import { formatBirthDatePoster } from "@/lib/lifeWeeks";
import { useLifeWeekColorMap } from "@/hooks/useLifeWeekColorMap";
import { lifeWeekColorAt } from "@/lib/lifeWeekCellColors";
import {
  BLINK_CELL,
  BLINK_GRID_H,
  BLINK_GRID_W,
  BLINK_LABEL_SIZE,
  BLINK_MARGIN_LEFT,
  BLINK_MARGIN_TOP,
  BLINK_WEEKS_PER_YEAR,
  BLINK_WEEKS_TOTAL,
  BLINK_YEAR_TICKS,
  BLINK_WEEK_TICKS,
  blinkColX,
  blinkGridHeightPx,
  blinkGridWidthPx,
  blinkRowY,
  blinkWeekIndexToPos,
} from "@/lib/blinkOfAnEyeGrid";
import { POSTER_CLASS } from "@/lib/lifeWeeksGrid";

type BlinkOfAnEyeChartProps = {
  birthDate: string;
  currentWeekIndex: number;
  personName?: string;
  className?: string;
};

function FlyingBirds({ x, y }: { x: number; y: number }) {
  const paths = [
    "M0 0c2-1 4-1 6 0 2 1 4 1 6 0",
    "M14 6c2-1 4-1 6 0 2 1 4 1 6 0",
    "M28 12c2-1 4-1 6 0 2 1 4 1 6 0",
  ];
  return (
    <g transform={`translate(${x}, ${y})`} opacity={0.85} aria-hidden>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          className="stroke-current"
          strokeWidth={1.25}
          strokeLinecap="round"
          transform={`translate(${i * 10}, ${i * 5}) scale(0.9)`}
        />
      ))}
    </g>
  );
}

export function BlinkOfAnEyeChart({
  birthDate,
  currentWeekIndex,
  personName,
  className,
}: BlinkOfAnEyeChartProps) {
  const gridW = blinkGridWidthPx();
  const gridH = blinkGridHeightPx();
  const subtitle = formatBirthDatePoster(birthDate);
  const title = personName ? `The Blink of an Eye · ${personName}` : "The Blink of an Eye";
  const cappedWeekIndex = Math.min(currentWeekIndex, BLINK_WEEKS_TOTAL - 1);
  const pastBlinkSpan = currentWeekIndex >= BLINK_WEEKS_TOTAL;
  const colorMap = useLifeWeekColorMap({
    birthDate,
    totalCells: BLINK_WEEKS_TOTAL,
    cols: BLINK_WEEKS_PER_YEAR,
    scope: "blink",
  });

  return (
    <div className={cn("rounded-xl p-4 sm:p-5", POSTER_CLASS, className)}>
      <svg
        role="img"
        aria-label={`${title}: ${subtitle}, ${BLINK_WEEKS_PER_YEAR} weeks by ${BLINK_YEAR_TICKS.length - 1} years`}
        viewBox={`0 0 ${BLINK_GRID_W} ${BLINK_GRID_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full max-w-md mx-auto text-zinc-900"
        style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
      >
      <title>{title}</title>

      <text x={BLINK_GRID_W / 2} y={18} textAnchor="middle" className="fill-current" style={{ fontSize: 15 }}>
        The Blink of an Eye
      </text>
      {personName ? (
        <text x={BLINK_GRID_W / 2} y={30} textAnchor="middle" className="fill-current opacity-80" style={{ fontSize: 11 }}>
          {personName}
        </text>
      ) : null}
      <text
        x={BLINK_GRID_W / 2}
        y={personName ? 42 : 34}
        textAnchor="middle"
        className="fill-current opacity-75"
        style={{ fontSize: 10 }}
      >
        {subtitle}
      </text>

      <text
        x={BLINK_MARGIN_LEFT + gridW / 2}
        y={BLINK_MARGIN_TOP - 18}
        textAnchor="middle"
        className="fill-current opacity-70"
        style={{ fontSize: BLINK_LABEL_SIZE }}
      >
        Years
      </text>

      <text
        x={12}
        y={BLINK_MARGIN_TOP + gridH / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${BLINK_MARGIN_TOP + gridH / 2})`}
        className="fill-current opacity-70"
        style={{ fontSize: BLINK_LABEL_SIZE }}
      >
        Weeks
      </text>

      {BLINK_YEAR_TICKS.map((year) => {
        const x = BLINK_MARGIN_LEFT + blinkColX(year) + BLINK_CELL / 2;
        return (
          <text
            key={`y-${year}`}
            x={x}
            y={BLINK_MARGIN_TOP - 6}
            textAnchor="middle"
            className="fill-current opacity-60"
            style={{ fontSize: BLINK_LABEL_SIZE - 1 }}
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
            x={BLINK_MARGIN_LEFT - 6}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-current opacity-60"
            style={{ fontSize: BLINK_LABEL_SIZE - 1 }}
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
        const fill = colorMap ? lifeWeekColorAt(colorMap, i) : undefined;

        return (
          <g key={i}>
            {isPast && (
              <rect
                x={x}
                y={y}
                width={BLINK_CELL}
                height={BLINK_CELL}
                fill={fill}
                className={fill ? undefined : "fill-current"}
              />
            )}
            {isFuture && (
              <rect
                x={x + 0.35}
                y={y + 0.35}
                width={BLINK_CELL - 0.7}
                height={BLINK_CELL - 0.7}
                fill="none"
                className="stroke-current opacity-35"
                strokeWidth={0.75}
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
                />
                <rect
                  x={x - 1}
                  y={y - 1}
                  width={BLINK_CELL + 2}
                  height={BLINK_CELL + 2}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={1.5}
                />
              </>
            )}
          </g>
        );
      })}

      <FlyingBirds x={BLINK_MARGIN_LEFT + gridW - 8} y={BLINK_MARGIN_TOP + gridH - 4} />

      <text
        x={BLINK_GRID_W / 2}
        y={BLINK_GRID_H - 6}
        textAnchor="middle"
        className="fill-current opacity-50"
        style={{ fontSize: 7, letterSpacing: "0.2em" }}
      >
        {`${BLINK_WEEKS_TOTAL.toLocaleString()} weeks · ${APP_NAME}`}
      </text>
    </svg>
    </div>
  );
}
