import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  ensureDefaults,
  lastNDates,
  listArchivedPriorities,
  listLogsForRange,
  listPriorities,
  localDateISO,
  restorePriority,
  type LifePriorityRow,
} from "@/lib/lifePriorities";
import { LifePrioritiesManageSheet } from "@/components/home/LifePrioritiesPanel";
import { cn } from "@/lib/utils";

function parseKey(row: LifePriorityRow): string {
  return row.key;
}

export default function LifePrioritiesPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(true);
  const [priorities, setPriorities] = useState<LifePriorityRow[]>([]);
  const [archived, setArchived] = useState<LifePriorityRow[]>([]);
  const [logs, setLogs] = useState<{ priority_id: string; log_date: string }[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [now] = useState(() => new Date());

  const todayISO = useMemo(() => localDateISO(now), [now]);
  const dates30 = useMemo(() => lastNDates(todayISO, 30), [todayISO]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      await ensureDefaults();
      const [pri, arc, startISO] = await Promise.all([
        listPriorities(user.id),
        listArchivedPriorities(user.id),
        Promise.resolve(dates30[0]),
      ]);
      setPriorities(pri);
      setArchived(arc);
      const rangeLogs = await listLogsForRange(user.id, startISO, todayISO);
      setLogs(rangeLogs.map((l) => ({ priority_id: l.priority_id, log_date: l.log_date })));
    } catch (e) {
      toast({
        title: "Couldn't load",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [user?.id, dates30, todayISO]);

  useEffect(() => {
    void load();
  }, [load]);

  const hitSet = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of logs) {
      const s = m.get(l.priority_id) ?? new Set<string>();
      s.add(l.log_date);
      m.set(l.priority_id, s);
    }
    return m;
  }, [logs]);

  const onRestore = async (id: string) => {
    if (!user?.id) return;
    try {
      await restorePriority(user.id, id);
      await load();
      toast({ title: "Lane restored", description: "Back on your home view." });
    } catch (e) {
      toast({
        title: "Couldn't restore",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background pb-safe-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-3 py-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/home" aria-label="Back to home">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight truncate">Life priorities</h1>
          <p className="text-xs text-muted-foreground truncate">Last 30 days · explicit check-ins only</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSheetOpen(true)} disabled={busy}>
          Edit
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {busy ? (
          <div className="flex justify-center py-16 text-muted-foreground gap-2 items-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <section className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left font-medium p-2 sticky left-0 bg-muted/40 z-[1] min-w-[120px]">Lane</th>
                    {dates30.map((d) => (
                      <th key={d} className="p-1 font-normal text-muted-foreground whitespace-nowrap tabular-nums w-8">
                        {d.slice(8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priorities.map((p) => {
                    const set = hitSet.get(p.id);
                    return (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="p-2 sticky left-0 bg-card font-medium leading-tight align-top">
                          <span className="block truncate max-w-[140px]">{p.label}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{parseKey(p)}</span>
                        </td>
                        {dates30.map((d) => {
                          const on = set?.has(d);
                          return (
                            <td key={d} className="p-0 text-center align-middle">
                              <span
                                className={cn(
                                  "inline-block w-2.5 h-2.5 rounded-full mx-auto",
                                  on ? "bg-emerald-500" : "bg-muted",
                                )}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {archived.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Archived lanes</h2>
                <ul className="space-y-2">
                  {archived.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-muted/20">
                      <span className="text-sm">{a.label}</span>
                      <Button size="sm" variant="secondary" onClick={() => onRestore(a.id)}>
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <LifePrioritiesManageSheet open={sheetOpen} onOpenChange={setSheetOpen} userId={user.id} priorities={priorities} onUpdated={load} />
    </div>
  );
}
