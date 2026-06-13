import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { READING_PLANS, getReadingPlan, type ReadingPlan } from "@/data/readingPlans";
import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { hubShellPageRoot, hubShellScrollMain } from "@/lib/shell/hubShellClasses";

type ProgressRow = { plan_id: string; day_index: number };

export default function ReadingPlansPage() {
  const { user, profile, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    supabase
      .from("reading_plan_progress")
      .select("plan_id, day_index")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.warn(formatSupabaseError(error));
          setProgress([]);
        } else {
          setProgress((data ?? []) as ProgressRow[]);
        }
      })
      .finally(() => setBusy(false));
  }, [user]);

  const completedByPlan = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const row of progress) {
      if (!map.has(row.plan_id)) map.set(row.plan_id, new Set());
      map.get(row.plan_id)!.add(row.day_index);
    }
    return map;
  }, [progress]);

  const selectedPlan = selectedId ? getReadingPlan(selectedId) : null;

  const markDayComplete = async (plan: ReadingPlan, dayIndex: number) => {
    if (!user) return;
    const { error } = await supabase.from("reading_plan_progress").insert({
      user_id: user.id,
      plan_id: plan.id,
      day_index: dayIndex,
    });
    if (error) {
      toast({ variant: "destructive", title: "Could not save progress", description: formatSupabaseError(error) });
      return;
    }
    setProgress((prev) => [...prev, { plan_id: plan.id, day_index: dayIndex }]);
  };

  const openDay = (plan: ReadingPlan, dayIndex: number) => {
    const day = plan.schedule.find((d) => d.day === dayIndex);
    const first = day?.readings[0];
    if (!first) return;
    void markDayComplete(plan, dayIndex);
    navigate(`/read/${first.book}/${first.chapter}`);
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && user && needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  return (
    <div
      className={hubShellPageRoot(
        showHubShell,
        "min-h-[100dvh] bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]",
      )}
    >
      <header
        className={
          showHubShell
            ? "flex h-14 shrink-0 items-center border-b bg-background px-4"
            : "sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        }
      >
        {!showHubShell && (
        <Button variant="ghost" size="icon" asChild>
          <Link to="/home" aria-label="Back to home">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        )}
        <h1 className="text-lg font-semibold">Reading plans</h1>
      </header>

      <div className={hubShellScrollMain(showHubShell, "max-w-lg mx-auto px-4 py-4 space-y-4")}>
        {busy && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        )}

        {!selectedPlan ? (
          <div className="space-y-3">
            {READING_PLANS.map((plan) => {
              const done = completedByPlan.get(plan.id)?.size ?? 0;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedId(plan.id)}
                  className="w-full text-left rounded-2xl border bg-card p-4 hover:bg-muted/40 transition"
                >
                  <p className="font-semibold">{plan.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {plan.days} days · {done} completed
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-sm text-primary font-medium"
            >
              ← All plans
            </button>
            <div>
              <h2 className="text-xl font-bold">{selectedPlan.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selectedPlan.description}</p>
            </div>
            <div className="space-y-2">
              {selectedPlan.schedule.map((day) => {
                const done = completedByPlan.get(selectedPlan.id)?.has(day.day);
                return (
                  <button
                    key={day.day}
                    type="button"
                    onClick={() => openDay(selectedPlan, day.day)}
                    className="w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left hover:bg-muted/40"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : day.day}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{day.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {day.readings.map((r) => `${r.book} ${r.chapter}`).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
