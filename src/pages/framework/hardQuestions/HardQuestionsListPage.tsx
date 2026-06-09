import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CircleHelp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FrameworkLayout from "../FrameworkLayout";
import { Button } from "@/components/ui/button";
import { HARD_QUESTION_SEEDS } from "@/data/hardQuestionSeeds";
import {
  deleteHardQuestion,
  fetchHardQuestions,
  instantiateHardQuestionSeed,
  statusLabel,
  type HardQuestionRow,
  type HardQuestionStatus,
} from "@/lib/framework/hardQuestions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const FILTERS: { id: HardQuestionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "researching", label: "Researching" },
  { id: "concluded", label: "Concluded" },
  { id: "parked", label: "Parked" },
];

export default function HardQuestionsListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<HardQuestionRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<HardQuestionStatus | "all">("all");
  const [seedBusy, setSeedBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const data = await fetchHardQuestions(supabase, user.id, filter);
    setRows(data);
    setFetching(false);
  }, [user, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const usedSeedKeys = useMemo(
    () => new Set(rows.map((r) => r.seed_key).filter(Boolean) as string[]),
    [rows],
  );

  const availableSeeds = useMemo(
    () => HARD_QUESTION_SEEDS.filter((s) => !usedSeedKeys.has(s.key)),
    [usedSeedKeys],
  );

  const startSeed = async (key: string) => {
    if (!user) return;
    setSeedBusy(key);
    const row = await instantiateHardQuestionSeed(supabase, user.id, key);
    setSeedBusy(null);
    if (row) navigate(`/framework/hard-questions/${row.id}`);
    else toast({ title: "Could not start question", variant: "destructive" });
  };

  const remove = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Delete this hard question? This cannot be undone.")) return;
    const ok = await deleteHardQuestion(supabase, user.id, id);
    if (ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Deleted" });
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Hard Questions" back="/framework">
      <p className="mb-6 text-sm text-muted-foreground leading-relaxed max-w-2xl">
        Park difficult theological questions, gather what people are saying, research across lenses, and land
        conclusions that update your framework.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to="/framework/hard-questions/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New question
          </Link>
        </Button>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {availableSeeds.length > 0 ? (
        <section className="mb-8 rounded-xl border border-border/60 bg-card/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">Starter questions</h2>
          </div>
          <ul className="space-y-3">
            {availableSeeds.map((seed) => (
              <li
                key={seed.key}
                className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground leading-snug">{seed.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{seed.framing}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={seedBusy === seed.key}
                  onClick={() => void startSeed(seed.key)}
                >
                  {seedBusy === seed.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Start researching"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fetching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          <CircleHelp className="mx-auto mb-3 h-8 w-8 opacity-50" aria-hidden />
          <p>No hard questions yet.</p>
          <p className="mt-2">Start from a starter above or add your own.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <li
              key={q.id}
              className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <Link to={`/framework/hard-questions/${q.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {statusLabel(q.status as HardQuestionStatus)}
                    </span>
                    {q.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                    {q.title}
                  </h3>
                  {q.conclusion ? (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{q.conclusion}</p>
                  ) : q.framing ? (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">{q.framing}</p>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(q.id)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}
