import { useEffect, useMemo, useRef } from "react";
import { Flame, StickyNote } from "lucide-react";
import type { HabitRow } from "@/lib/habits/api";
import { isMissedDay } from "@/lib/habits/credit";
import {
  dateISOInMonth,
  daysInMonth,
  effectiveLastDay,
  parseYearMonth,
  weekdayShort,
} from "@/lib/habits/dates";
import { completionKey } from "@/lib/habits/stats";
import { currentStreak, maxStreak } from "@/lib/habits/streaks";
import { cn } from "@/lib/utils";

type Props = {
  yearMonth: string;
  habits: HabitRow[];
  completionSet: Set<string>;
  creditCompletionSet: Set<string>;
  streakDatesByHabit: Map<string, string[]>;
  todayDay: number | null;
  onToggle: (habitId: string, day: number, next: boolean) => void;
  onEditNote: (habit: HabitRow) => void;
};

const HABIT_COL_WIDTH = 176;

export function HabitsMonthGrid({
  yearMonth,
  habits,
  completionSet,
  creditCompletionSet,
  streakDatesByHabit,
  todayDay,
  onToggle,
  onEditNote,
}: Props) {
  const { year, month } = parseYearMonth(yearMonth);
  const totalDays = daysInMonth(year, month);
  const lastDay = effectiveLastDay(year, month, yearMonth);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayHeaderRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (todayDay == null) return;
    const container = scrollRef.current;
    const marker = todayHeaderRef.current;
    if (!container || !marker) return;

    const raf = requestAnimationFrame(() => {
      const targetLeft = marker.offsetLeft - HABIT_COL_WIDTH - 12;
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollLeft = Math.min(maxScroll, Math.max(0, targetLeft));
    });
    return () => cancelAnimationFrame(raf);
  }, [todayDay, yearMonth, habits.length]);

  if (habits.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-zinc-300 bg-white/60 p-8 text-center text-sm text-muted-foreground">
        No habits yet. Add one or import defaults to start tracking.
      </div>
    );
  }

  return (
    <div className="rounded-[22px] bg-white/90 border border-zinc-200/80 shadow-sm overflow-hidden w-full">
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-[11px]">
          <colgroup>
            <col className="w-44" />
            <col className="w-10" />
            <col className="w-10" />
            {days.map((day) => (
              <col key={day} />
            ))}
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              <th className="sticky left-0 z-20 bg-zinc-50/95 backdrop-blur px-3 py-2 text-left font-semibold text-zinc-600">
                Habit
              </th>
              <th className="px-1 py-2 text-center font-medium text-zinc-500">Cur</th>
              <th className="px-1 py-2 text-center font-medium text-zinc-500">Max</th>
              {days.map((day) => (
                <th
                  key={day}
                  ref={todayDay === day ? todayHeaderRef : undefined}
                  className="px-0 py-1 text-center font-normal"
                >
                  <span className="block text-[9px] text-zinc-400 leading-none">{weekdayShort(year, month, day)}</span>
                  <span
                    className={cn(
                      "block text-[11px] font-semibold tabular-nums leading-tight",
                      todayDay === day && "text-emerald-600",
                    )}
                  >
                    {day}
                  </span>
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-zinc-50/95 px-2 py-2 w-8" aria-label="Notes" />
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => {
              const dates = streakDatesByHabit.get(habit.id) ?? [];
              const cur = currentStreak(dates);
              const max = maxStreak(dates);
              return (
                <tr key={habit.id} className="border-b border-zinc-50 last:border-0">
                  <td className="sticky left-0 z-10 bg-white/95 backdrop-blur px-3 py-2 align-middle">
                    <p className="font-medium text-zinc-900 leading-snug line-clamp-2">{habit.name}</p>
                    {habit.category ? (
                      <p className="text-[10px] text-zinc-400 truncate">{habit.category}</p>
                    ) : null}
                  </td>
                  <td className="px-1 py-2 text-center tabular-nums font-semibold text-emerald-600">
                    <span className="inline-flex items-center justify-center gap-0.5">
                      {cur >= 7 ? <Flame className="w-3 h-3 text-orange-500" aria-hidden /> : null}
                      {cur}
                    </span>
                  </td>
                  <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{max}</td>
                  {days.map((day) => {
                    const key = completionKey(habit.id, year, month, day);
                    const marked = completionSet.has(key);
                    const credited = creditCompletionSet.has(key);
                    const late = marked && !credited;
                    const iso = dateISOInMonth(year, month, day);
                    const future = day > lastDay;
                    const missed = !future && isMissedDay(iso, marked);
                    const disabled = future;
                    const statusLabel = credited
                      ? "done"
                      : late
                        ? "logged late, no credit"
                        : missed
                          ? "missed"
                          : "not done";
                    return (
                      <td key={day} className="p-0.5 text-center">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            try {
                              navigator.vibrate?.(8);
                            } catch {
                              /* optional haptic */
                            }
                            onToggle(habit.id, day, !marked);
                          }}
                          aria-label={`${habit.name} day ${day} ${statusLabel}`}
                          title={
                            late
                              ? "Logged after the 48h window — no streak credit"
                              : missed
                                ? "Not completed in time — no credit"
                                : undefined
                          }
                          className={cn(
                            "mx-auto w-full max-w-8 aspect-square rounded-lg border transition-all active:scale-90",
                            disabled && "opacity-30 cursor-not-allowed",
                            credited && "bg-emerald-500 border-emerald-600 shadow-sm",
                            late && "bg-emerald-50 border-emerald-500 border-dashed",
                            missed && "bg-rose-50 border-rose-200",
                            !marked && !missed && !disabled && "bg-zinc-50 border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50",
                            todayDay === day && !marked && "ring-2 ring-emerald-300/60",
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-white/95 px-1 py-2">
                    <button
                      type="button"
                      onClick={() => onEditNote(habit)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95"
                      aria-label={`Note for ${habit.name}`}
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function isoForToggle(yearMonth: string, day: number): string {
  const { year, month } = parseYearMonth(yearMonth);
  return dateISOInMonth(year, month, day);
}
