import { useMemo } from "react";
import { Lock } from "lucide-react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
import type { DotProps } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { computeDailySummary } from "@/lib/habits/dailySummary";
import { cn } from "@/lib/utils";

type Props = {
  yearMonth: string;
  habitIds: string[];
  completionSet: Set<string>;
  creditCompletionSet: Set<string>;
  className?: string;
};

const chartConfig = {
  pct: {
    label: "Daily completion",
    color: "#1b4332",
  },
} satisfies ChartConfig;

const LINE_COLOR = "#1b4332";
const LABEL_COLOR = "#40916c";

function SummaryDot({ cx, cy, payload }: DotProps & { payload?: { locked?: boolean; pct?: number | null } }) {
  if (cx == null || cy == null || !payload) return null;

  if (payload.locked) {
    return (
      <foreignObject x={cx - 8} y={cy - 30} width={16} height={16}>
        <Lock className="h-4 w-4 text-amber-500" aria-hidden />
      </foreignObject>
    );
  }

  if (payload.pct == null) return null;

  return <circle cx={cx} cy={cy} r={4} fill={LINE_COLOR} stroke="#fff" strokeWidth={1.5} />;
}

function SummaryLabel(props: {
  x?: number;
  y?: number;
  value?: string;
  index?: number;
  payload?: { locked?: boolean; displayLabel?: string };
}) {
  const { x, y, payload } = props;
  if (x == null || y == null || !payload || payload.locked || !payload.displayLabel) return null;

  return (
    <text
      x={x}
      y={y - 10}
      textAnchor="middle"
      className="fill-[#40916c] text-[10px] font-semibold"
    >
      {payload.displayLabel}
    </text>
  );
}

export function HabitsMonthSummaryChart({
  yearMonth,
  habitIds,
  completionSet,
  creditCompletionSet,
  className,
}: Props) {
  const data = useMemo(
    () => computeDailySummary(habitIds.length, habitIds, creditCompletionSet, completionSet, yearMonth),
    [habitIds, creditCompletionSet, completionSet, yearMonth],
  );

  if (habitIds.length === 0) return null;

  const chartData = data.map((point) => ({
    day: point.day,
    pct: point.locked ? null : point.pct,
    locked: point.locked,
    displayLabel: point.displayLabel,
  }));

  return (
    <section
      className={cn(
        "rounded-[22px] border border-zinc-200/80 bg-zinc-100/90 shadow-sm overflow-hidden w-full",
        className,
      )}
    >
      <h3 className="px-4 pt-4 pb-1 text-center text-base font-bold tracking-tight text-zinc-900">
        Month Summary
      </h3>
      <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full px-2 pb-3">
        <LineChart data={chartData} margin={{ top: 28, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="#d4d4d8" strokeOpacity={0.65} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#71717a" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[-25, 100]}
            ticks={[75, 50, 25, 0, -25]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickFormatter={(v) => `${v}%`}
            width={36}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke={LINE_COLOR}
            strokeWidth={2.5}
            connectNulls={false}
            dot={(props) => <SummaryDot {...props} />}
            activeDot={{ r: 5, fill: LINE_COLOR }}
          >
            <LabelList dataKey="displayLabel" content={<SummaryLabel />} />
          </Line>
        </LineChart>
      </ChartContainer>
    </section>
  );
}
