import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BookOpenText,
  Briefcase,
  ChevronRight,
  HandHeart,
  HeartPulse,
  Loader2,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import {
  addMinutesToday,
  archivePriority,
  ensureDefaults,
  lastNDates,
  listLogsForRange,
  listPriorities,
  localDateISO,
  logToday,
  reorder,
  type LifePriorityRow,
  type PriorityKey,
  unlogToday,
  updatePriority,
} from "@/lib/lifePriorities";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT_DOT: Record<string, string> = {
  "amber-500": "bg-amber-500",
  "rose-500": "bg-rose-500",
  "sky-500": "bg-sky-500",
  "violet-500": "bg-violet-500",
  "emerald-500": "bg-emerald-500",
};

const DEFAULT_ACCENTS: Record<PriorityKey, string> = {
  god: "amber-500",
  health: "rose-500",
  family: "sky-500",
  work: "violet-500",
  others: "emerald-500",
};

const ICONS: Record<PriorityKey, LucideIcon> = {
  god: BookOpenText,
  health: HeartPulse,
  family: Users,
  work: Briefcase,
  others: HandHeart,
};

const MINUTE_PRESETS = [10, 20, 30, 60] as const;

function parseKey(row: LifePriorityRow): PriorityKey {
  const k = row.key as PriorityKey;
  if (k === "god" || k === "health" || k === "family" || k === "work" || k === "others") return k;
  return "others";
}

function accentDot(color: string | null, key: PriorityKey): string {
  const token = color ?? DEFAULT_ACCENTS[key];
  return ACCENT_DOT[token] ?? "bg-zinc-400";
}

function accentBorder(color: string | null, key: PriorityKey): string {
  const token = color ?? DEFAULT_ACCENTS[key];
  const map: Record<string, string> = {
    "amber-500": "border-l-amber-500",
    "rose-500": "border-l-rose-500",
    "sky-500": "border-l-sky-500",
    "violet-500": "border-l-violet-500",
    "emerald-500": "border-l-emerald-500",
  };
  return map[token] ?? "border-l-zinc-400";
}

function intentionFragments(intention: string | null): string[] {
  if (!intention?.trim()) return [];
  return intention
    .split(/[·•|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ManageSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  priorities: LifePriorityRow[];
  onUpdated: () => Promise<void>;
};

/** Settings sheet: reorder, rename, targets, archive — reused on `/life/priorities`. */
export function LifePrioritiesManageSheet({
  open,
  onOpenChange,
  userId,
  priorities,
  onUpdated,
}: ManageSheetProps) {
  const [order, setOrder] = useState<LifePriorityRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setOrder([...priorities]);
  }, [open, priorities]);

  const persistReorder = async (next: LifePriorityRow[]) => {
    setBusy(true);
    try {
      await reorder(
        userId,
        next.map((r) => r.id),
      );
      await onUpdated();
    } catch (e) {
      toast({
        title: "Couldn't save order",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const copy = [...order];
    const tmp = copy[idx];
    copy[idx] = copy[j];
    copy[j] = tmp;
    setOrder(copy);
    await persistReorder(copy);
  };

  const saveField = async (id: string, patch: { label?: string; intention?: string | null; daily_target_minutes?: number }) => {
    try {
      await updatePriority(userId, id, patch);
      await onUpdated();
    } catch (e) {
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const onArchive = async (row: LifePriorityRow) => {
    const ok = window.confirm(`Hide "${row.label}" from home? You can bring it back from the priorities overview.`);
    if (!ok) return;
    setBusy(true);
    try {
      await archivePriority(userId, row.id);
      await onUpdated();
      toast({ title: "Lane archived", description: "Hidden from home — restore anytime from the overview." });
    } catch (e) {
      toast({
        title: "Couldn't archive",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left space-y-1">
          <SheetTitle>Priorities</SheetTitle>
          <SheetDescription>Rename lanes, reorder what matters most, and set gentle time hints.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-8">
          {order.map((row, idx) => {
            const pk = parseKey(row);
            const Icon = ICONS[pk];
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-xl border border-zinc-200/90 bg-white/90 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80",
                  "border-l-4",
                  accentBorder(row.color, pk),
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-5 h-5 shrink-0 mt-1 text-zinc-700 dark:text-zinc-200" strokeWidth={2} />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={busy || idx === 0} onClick={() => move(idx, -1)} aria-label="Move up">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={busy || idx === order.length - 1}
                        onClick={() => move(idx, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-medium text-zinc-500 tabular-nums ml-1">#{idx + 1}</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`lp-label-${row.id}`}>Label</Label>
                      <Input
                        id={`lp-label-${row.id}`}
                        defaultValue={row.label}
                        key={`${row.id}-label-field`}
                        onBlur={(ev) => {
                          const v = ev.target.value.trim();
                          if (v && v !== row.label) void saveField(row.id, { label: v });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`lp-int-${row.id}`}>Intention</Label>
                      <Input
                        id={`lp-int-${row.id}`}
                        defaultValue={row.intention ?? ""}
                        key={`${row.id}-int`}
                        onBlur={(ev) => {
                          const v = ev.target.value.trim();
                          if (v !== (row.intention ?? "")) void saveField(row.id, { intention: v || null });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`lp-target-${row.id}`}>Daily target (minutes, optional)</Label>
                      <Input
                        id={`lp-target-${row.id}`}
                        type="number"
                        min={0}
                        defaultValue={row.daily_target_minutes}
                        key={`${row.id}-tgt`}
                        onBlur={(ev) => {
                          const n = Math.max(0, Number(ev.target.value) || 0);
                          if (n !== row.daily_target_minutes) void saveField(row.id, { daily_target_minutes: n });
                        }}
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="text-destructive border-destructive/40" disabled={busy} onClick={() => onArchive(row)}>
                      Archive lane
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LifePrioritiesPanel() {
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [priorities, setPriorities] = useState<LifePriorityRow[]>([]);
  const [logsByPidDay, setLogsByPidDay] = useState<Map<string, Set<string>>>(new Map());
  const [todayLogs, setTodayLogs] = useState<Map<string, { minutes: number }>>(new Map());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayISO = useMemo(() => localDateISO(now), [now]);
  const weekDates = useMemo(() => lastNDates(todayISO, 7), [todayISO]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await ensureDefaults();
      const pri = await listPriorities(userId);
      setPriorities(pri);
      const start = weekDates[0];
      const logs = await listLogsForRange(userId, start, todayISO);
      const map = new Map<string, Set<string>>();
      const todayMap = new Map<string, { minutes: number }>();
      for (const l of logs) {
        const set = map.get(l.priority_id) ?? new Set<string>();
        set.add(l.log_date);
        map.set(l.priority_id, set);
        if (l.log_date === todayISO) todayMap.set(l.priority_id, { minutes: l.minutes });
      }
      setLogsByPidDay(map);
      setTodayLogs(todayMap);
    } catch (e) {
      toast({
        title: "Couldn't load priorities",
        description: e instanceof Error ? e.message : "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, weekDates, todayISO]);

  useEffect(() => {
    void load();
  }, [load]);

  const lanesLoggedToday = useMemo(() => {
    let n = 0;
    for (const p of priorities) {
      if (todayLogs.has(p.id)) n++;
    }
    return n;
  }, [priorities, todayLogs]);

  const hour = now.getHours();
  const showEveningBanner = lanesLoggedToday === 0 && hour >= 20;
  const showMorningBanner = lanesLoggedToday === 0 && hour < 8;

  const focusPhrase = useMemo(() => {
    const total = priorities.length;
    if (total === 0) return "";
    if (lanesLoggedToday === 0) return `Quiet check-ins today · ${total} lanes ready when you are`;
    if (lanesLoggedToday === total) return `Today's footing · all ${total} lanes acknowledged`;
    return `Today's footing · ${lanesLoggedToday} of ${total} lanes checked in`;
  }, [lanesLoggedToday, priorities.length]);

  const toggleLane = async (priorityId: string) => {
    if (!userId) return;
    try {
      if (todayLogs.has(priorityId)) await unlogToday(userId, priorityId, todayISO);
      else await logToday(userId, priorityId, { minutes: 0 }, todayISO);
      await load();
    } catch (e) {
      toast({
        title: "Couldn't update",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const addMinutes = async (priorityId: string, add: number) => {
    if (!userId) return;
    try {
      await addMinutesToday(userId, priorityId, add, todayISO);
      await load();
    } catch (e) {
      toast({
        title: "Couldn't add time",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  if (!userId) return null;

  return (
    <>
      <section className="w-full text-left mb-3 p-3 sm:p-3.5 rounded-[18px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-800">
                <Activity className="w-3 h-3" aria-hidden /> Today's priorities
              </div>
              {!loading && priorities.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-medium border-zinc-400/70 bg-white/60 text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 px-1.5 py-0">
                  {lanesLoggedToday} of {priorities.length} today
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-snug line-clamp-2">{focusPhrase}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 h-7 gap-1 border-zinc-300 bg-white/70 text-zinc-800 text-xs px-2" onClick={() => setSheetOpen(true)} disabled={loading}>
            <Settings2 className="w-3 h-3" />
            Edit
          </Button>
        </div>

        {showEveningBanner && (
          <p className="mb-2 text-[12px] leading-snug text-zinc-700 dark:text-zinc-200 rounded-md bg-zinc-900/5 dark:bg-white/5 px-2.5 py-1.5 border border-zinc-200/60 dark:border-zinc-600/60">
            Want to mark how today went? Light taps count — no need to capture everything.
          </p>
        )}
        {showMorningBanner && (
          <div className="mb-2 rounded-md bg-zinc-900/5 dark:bg-white/5 px-2.5 py-1.5 border border-zinc-200/60 dark:border-zinc-600/60 space-y-1.5">
            <p className="text-[12px] leading-snug text-zinc-700 dark:text-zinc-200">Set your intentions for the day — pick what matters before the noise arrives.</p>
            <div className="flex flex-wrap gap-1">
              {priorities.map((p) => {
                const pk = parseKey(p);
                const frag = intentionFragments(p.intention)[0] ?? p.intention ?? p.label;
                return (
                  <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-600 pl-1.5 pr-1.5 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-200">
                    <span className={cn("w-1 h-1 rounded-full shrink-0", accentDot(p.color, pk))} aria-hidden />
                    <span className="font-medium">{p.label}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="truncate max-w-[100px] sm:max-w-[120px]">{frag}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Gathering your lanes…</span>
          </div>
        ) : priorities.length === 0 ? (
          <p className="text-xs text-zinc-600 py-2">No active priorities yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            {priorities.map((p) => {
              const pk = parseKey(p);
              const Icon = ICONS[pk];
              const logged = todayLogs.has(p.id);
              const minutesToday = todayLogs.get(p.id)?.minutes ?? 0;
              const daysSet = logsByPidDay.get(p.id) ?? new Set<string>();
              let touchedLast7 = 0;
              for (const d of weekDates) {
                if (daysSet.has(d)) touchedLast7++;
              }
              const gentleNeglect =
                !logged && touchedLast7 <= 2 ? `Quiet here lately · touched ${touchedLast7} of the last 7 days.` : !logged ? "Still open today." : null;
              const rowTitle = [p.label, p.intention, gentleNeglect].filter(Boolean).join(" — ");

              return (
                <li
                  key={p.id}
                  title={rowTitle}
                  className={cn(
                    "rounded-lg border border-zinc-200/90 bg-white/80 px-2 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50 border-l-[3px]",
                    accentBorder(p.color, pk),
                  )}
                >
                  <div className="flex items-center gap-2 min-h-[2.25rem]">
                    <div className="flex items-center gap-1 shrink-0 w-7 justify-center">
                      <span className="text-[9px] font-semibold text-zinc-500 tabular-nums leading-none">{p.rank}</span>
                      <Icon className="w-4 h-4 text-zinc-800 dark:text-zinc-100" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-tight text-zinc-900 dark:text-zinc-50 truncate">
                        <span className="font-semibold">{p.label}</span>
                        {p.intention ? <span className="font-normal text-zinc-500 dark:text-zinc-400"> · {p.intention}</span> : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleLane(p.id)}
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition border",
                        logged
                          ? "bg-emerald-600/90 border-emerald-700 text-white shadow-sm"
                          : "bg-zinc-100/90 border-zinc-300 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-600 dark:text-zinc-100",
                      )}
                    >
                      {logged ? "Done" : "Log"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1 pl-8 pr-0.5">
                    <span className="text-[9px] uppercase tracking-wide text-zinc-400 shrink-0">7d</span>
                    <div className="flex gap-0.5 flex-1 justify-end min-w-0">
                      {weekDates.map((d) => {
                        const hit = daysSet.has(d);
                        return (
                          <span key={d} title={d} className="flex justify-center">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                hit ? accentDot(p.color, pk) : "bg-zinc-300/90 dark:bg-zinc-600",
                              )}
                            />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {logged && (
                    <div className="flex flex-wrap items-center gap-1 mt-1 pl-8">
                      <span className="text-[10px] text-zinc-500 shrink-0">{minutesToday > 0 ? `${minutesToday} min` : "0 min"}</span>
                      {MINUTE_PRESETS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => addMinutes(p.id, m)}
                          className="rounded-full border border-zinc-300/90 bg-white/80 px-1.5 py-0 text-[10px] font-medium text-zinc-800 dark:bg-zinc-900 dark:border-zinc-600 dark:text-zinc-100 active:scale-[0.97]"
                        >
                          +{m}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2 flex flex-col gap-1">
          <Link
            to="/life/priorities"
            className="flex items-center justify-center gap-0.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-200 hover:underline"
          >
            30-day overview <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/life/todos"
            className="flex items-center justify-center gap-0.5 text-[12px] font-medium text-zinc-700 dark:text-zinc-200 hover:underline"
          >
            Tasks <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <LifePrioritiesManageSheet open={sheetOpen} onOpenChange={setSheetOpen} userId={userId} priorities={priorities} onUpdated={load} />
    </>
  );
}
