import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, LayoutDashboard, Loader2, ListPlus, Sparkles, Table2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { Button } from "@/components/ui/button";
import { HabitBadgesSection } from "@/components/habits/HabitBadgesSection";
import { HabitManageSheet } from "@/components/habits/HabitManageSheet";
import { HabitNoteDialog } from "@/components/habits/HabitNoteDialog";
import { HabitStreakSummary } from "@/components/habits/HabitStreakSummary";
import { HabitsHeader } from "@/components/habits/HabitsHeader";
import { HabitsMonthGrid, isoForToggle } from "@/components/habits/HabitsMonthGrid";
import { HabitsMonthNavBar } from "@/components/habits/HabitsMonthNavBar";
import { HabitsMonthSummaryChart } from "@/components/habits/HabitsMonthSummaryChart";
import { toast } from "@/hooks/use-toast";
import { readHabitsStatsExpanded, writeHabitsStatsExpanded } from "@/lib/habits/viewMode";
import { hubShellPageRoot, hubShellScrollMain } from "@/lib/shell/hubShellClasses";
import { formatSupabaseError as getErrorMessage } from "@/lib/supabase/errors";
import {
  countTotalCompletions,
  evaluateNewBadges,
  getBadgeDef,
} from "@/lib/habits/badges";
import { listUnlockedBadges, unlockBadges, type HabitBadgeRow } from "@/lib/habits/badgesApi";
import {
  archiveHabit,
  createHabit,
  getHabitNote,
  importDefaultHabits,
  listAllCompletionDates,
  listCompletionsForMonth,
  listHabits,
  reorderHabits,
  replaceHabitsWithDefaults,
  saveHabitNote,
  syncHabitFrameworkTemplate,
  toggleCompletion,
  type HabitRow,
} from "@/lib/habits/api";
import {
  addMonthsYearMonth,
  isSameYearMonth,
  parseYearMonth,
  yearMonthFromDate,
} from "@/lib/habits/dates";
import {
  activeDayStreak,
  perfectDayStreak,
  topHabitStreaks,
} from "@/lib/habits/overallStreak";
import { computeRingStats } from "@/lib/habits/ringStats";
import { isCreditWindowOpen } from "@/lib/habits/credit";
import { buildCompletionSets, completionKey, computeMonthStats } from "@/lib/habits/stats";

export default function HabitsPage() {
  const { user, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [yearMonth, setYearMonth] = useState(() => yearMonthFromDate());
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [completionSet, setCompletionSet] = useState<Set<string>>(new Set());
  const [creditCompletionSet, setCreditCompletionSet] = useState<Set<string>>(new Set());
  const [streakDatesByHabit, setStreakDatesByHabit] = useState<Map<string, string[]>>(new Map());
  const [unlockedBadges, setUnlockedBadges] = useState<HabitBadgeRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [noteHabit, setNoteHabit] = useState<HabitRow | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(() => readHabitsStatsExpanded());
  const badgeSyncRef = useRef(false);

  const todayDay = isSameYearMonth(yearMonth) ? new Date().getDate() : null;
  const { year, month } = parseYearMonth(yearMonth);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const canGoNext = yearMonth < yearMonthFromDate();
  const habitIds = useMemo(() => habits.map((h) => h.id), [habits]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      await syncHabitFrameworkTemplate().catch(() => undefined);
      const [habitList, completions, badges] = await Promise.all([
        listHabits(user.id),
        listCompletionsForMonth(user.id, yearMonth),
        listUnlockedBadges(user.id).catch(() => [] as HabitBadgeRow[]),
      ]);
      const { all, credit } = buildCompletionSets(completions, yearMonth);
      setHabits(habitList);
      setCompletionSet(all);
      setCreditCompletionSet(credit);
      const streakMap = await listAllCompletionDates(
        user.id,
        habitList.map((h) => h.id),
      );
      setStreakDatesByHabit(streakMap);
      setUnlockedBadges(badges);
    } catch (e) {
      toast({
        title: "Couldn't load habits",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [user?.id, yearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const categories = new Map(habits.map((h) => [h.id, h.category]));
    return computeMonthStats(
      habits.length,
      creditCompletionSet,
      categories,
      habitIds,
      yearMonth,
    );
  }, [habits, creditCompletionSet, yearMonth, habitIds]);

  const rings = useMemo(
    () => computeRingStats(habitIds, creditCompletionSet, yearMonth),
    [habitIds, creditCompletionSet, yearMonth],
  );

  const streakSummary = useMemo(
    () => ({
      active: activeDayStreak(streakDatesByHabit),
      perfect: perfectDayStreak(habitIds, streakDatesByHabit),
      top: topHabitStreaks(habits, streakDatesByHabit),
    }),
    [streakDatesByHabit, habitIds, habits],
  );

  const syncBadges = useCallback(async () => {
    if (!user?.id || habits.length === 0 || badgeSyncRef.current) return;
    badgeSyncRef.current = true;
    try {
      const already = new Set(unlockedBadges.map((b) => b.badge_id));
      const newIds = evaluateNewBadges(
        {
          habitIds,
          datesByHabit: streakDatesByHabit,
          stats,
          rings,
          totalCompletions: countTotalCompletions(streakDatesByHabit),
        },
        already,
      );
      if (newIds.length === 0) return;

      await unlockBadges(user.id, newIds);
      const refreshed = await listUnlockedBadges(user.id);
      setUnlockedBadges(refreshed);

      for (const id of newIds) {
        const def = getBadgeDef(id);
        if (def) {
          toast({
            title: "Award unlocked!",
            description: def.title,
          });
        }
      }
    } catch {
      /* badges table may not exist yet */
    } finally {
      badgeSyncRef.current = false;
    }
  }, [user?.id, habits.length, unlockedBadges, habitIds, streakDatesByHabit, stats, rings]);

  useEffect(() => {
    if (!busy && habits.length > 0) void syncBadges();
  }, [busy, habits.length, stats, rings, streakDatesByHabit, syncBadges]);

  const onToggle = async (habitId: string, day: number, next: boolean) => {
    if (!user?.id) return;
    const key = completionKey(habitId, year, month, day);
    const prev = new Set(completionSet);
    const prevCredit = new Set(creditCompletionSet);
    const optimistic = new Set(completionSet);
    const creditOptimistic = new Set(creditCompletionSet);
    const iso = isoForToggle(yearMonth, day);
    if (next) {
      optimistic.add(key);
      if (isCreditWindowOpen(iso)) creditOptimistic.add(key);
    } else {
      optimistic.delete(key);
      creditOptimistic.delete(key);
    }
    setCompletionSet(optimistic);
    setCreditCompletionSet(creditOptimistic);

    try {
      await toggleCompletion(user.id, habitId, iso, next);
      const dates = streakDatesByHabit.get(habitId) ?? [];
      const nextDates = next && isCreditWindowOpen(iso)
        ? [...new Set([...dates, iso])].sort()
        : dates.filter((d) => d !== iso);
      setStreakDatesByHabit(new Map(streakDatesByHabit).set(habitId, nextDates));
    } catch (e) {
      setCompletionSet(prev);
      setCreditCompletionSet(prevCredit);
      toast({
        title: "Couldn't save",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const onImportDefaults = async () => {
    if (!user?.id) return;
    try {
      const n = await importDefaultHabits(user.id);
      if (n === 0) {
        toast({ title: "Already up to date", description: "All season habits are already on your list." });
        return;
      }
      toast({ title: "Imported", description: `${n} season habits added.` });
      await load();
    } catch (e) {
      toast({
        title: "Import failed",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const onResetToSeason = async () => {
    if (!user?.id) return;
    try {
      const n = await replaceHabitsWithDefaults(user.id);
      toast({
        title: "Habits reset",
        description: `Your tracker now has ${n} season habits.`,
      });
      setManageOpen(false);
      await load();
    } catch (e) {
      toast({
        title: "Reset failed",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const openNote = async (habit: HabitRow) => {
    if (!user?.id) return;
    setNoteHabit(habit);
    try {
      const body = await getHabitNote(user.id, habit.id, yearMonth);
      setNoteBody(body);
      setNoteOpen(true);
    } catch (e) {
      toast({
        title: "Couldn't load note",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const thresholdMsg =
    stats.activeDaysPct >= 70
      ? "Outstanding month — keep the streak alive!"
      : stats.activeDaysPct >= 50
        ? "Halfway there — small wins compound."
        : stats.activeDaysPct >= 25
          ? "Building momentum — one tap at a time."
          : null;

  return (
    <div className={hubShellPageRoot(showHubShell, "min-h-[100dvh] bg-zinc-100 dark:bg-zinc-950 pb-safe-24")}>
      <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b bg-background/90 backdrop-blur px-3 py-3">
        {!showHubShell && (
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/home" aria-label="Back to home">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Habits</h1>
          <p className="text-xs text-muted-foreground">
            {statsExpanded ? "Rings · streaks · awards" : "Habit chart"}
          </p>
        </div>
        {habits.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              const next = !statsExpanded;
              setStatsExpanded(next);
              writeHabitsStatsExpanded(next);
            }}
          >
            {statsExpanded ? (
              <>
                <Table2 className="w-4 h-4 mr-1" />
                Focus chart
              </>
            ) : (
              <>
                <LayoutDashboard className="w-4 h-4 mr-1" />
                Show stats
              </>
            )}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setManageOpen(true)}>
          <ListPlus className="w-4 h-4 mr-1" />
          Manage
        </Button>
      </header>

      <div className={hubShellScrollMain(showHubShell, "px-4 py-4 space-y-4")}>
        {busy ? (
          <div className="flex justify-center py-16 text-muted-foreground gap-2 items-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            {statsExpanded ? (
              <div className="mx-auto w-full max-w-4xl space-y-4">
                <HabitsHeader
                  monthLabel={monthLabel}
                  stats={stats}
                  rings={rings}
                  onPrevMonth={() => setYearMonth((ym) => addMonthsYearMonth(ym, -1))}
                  onNextMonth={() => setYearMonth((ym) => addMonthsYearMonth(ym, 1))}
                  canGoNext={canGoNext}
                />

                {habits.length > 0 ? (
                  <HabitStreakSummary
                    activeStreak={streakSummary.active}
                    perfectStreak={streakSummary.perfect}
                    topHabits={streakSummary.top}
                  />
                ) : null}

                {thresholdMsg ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800/50 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <p>{thresholdMsg}</p>
                  </div>
                ) : null}

                {habits.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Button type="button" onClick={() => void onImportDefaults()}>
                      Import defaults from sheet
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setManageOpen(true)}>
                      Add habits manually
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : habits.length === 0 ? (
              <div className="mx-auto w-full max-w-4xl">
                <div className="flex flex-col items-center gap-3 py-8">
                  <Button type="button" onClick={() => void onImportDefaults()}>
                    Import season habits
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setManageOpen(true)}>
                    Add habits manually
                  </Button>
                </div>
              </div>
            ) : null}

            {habits.length > 0 ? (
              <>
                {!statsExpanded ? (
                  <HabitsMonthNavBar
                    monthLabel={monthLabel}
                    canGoNext={canGoNext}
                    onPrevMonth={() => setYearMonth((ym) => addMonthsYearMonth(ym, -1))}
                    onNextMonth={() => setYearMonth((ym) => addMonthsYearMonth(ym, 1))}
                  />
                ) : null}
                {statsExpanded ? (
                  <>
                    <HabitBadgesSection unlocked={unlockedBadges} />
                    <HabitsMonthSummaryChart
                      yearMonth={yearMonth}
                      habitIds={habitIds}
                      completionSet={completionSet}
                      creditCompletionSet={creditCompletionSet}
                    />
                  </>
                ) : null}
                <HabitsMonthGrid
                  yearMonth={yearMonth}
                  habits={habits}
                  completionSet={completionSet}
                  creditCompletionSet={creditCompletionSet}
                  streakDatesByHabit={streakDatesByHabit}
                  todayDay={todayDay}
                  onToggle={(id, day, next) => void onToggle(id, day, next)}
                  onEditNote={(h) => void openNote(h)}
                />
              </>
            ) : null}
          </>
        )}
      </div>

      <HabitManageSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        habits={habits}
        onImportDefaults={onImportDefaults}
        onResetToSeason={onResetToSeason}
        onAdd={async (name, category) => {
          if (!user?.id) return;
          await createHabit(user.id, { name, category, sort_order: habits.length });
          await load();
        }}
        onArchive={async (id) => {
          if (!user?.id) return;
          await archiveHabit(user.id, id);
          await load();
        }}
        onReorder={async (ids) => {
          if (!user?.id) return;
          await reorderHabits(user.id, ids);
          await load();
        }}
      />

      <HabitNoteDialog
        open={noteOpen}
        habit={noteHabit}
        initialBody={noteBody}
        onOpenChange={setNoteOpen}
        onSave={async (body) => {
          if (!user?.id || !noteHabit) return;
          await saveHabitNote(user.id, noteHabit.id, yearMonth, body);
          toast({ title: "Note saved" });
        }}
      />
    </div>
  );
}
