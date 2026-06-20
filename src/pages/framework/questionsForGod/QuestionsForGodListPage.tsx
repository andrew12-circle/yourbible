import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { HandHeart, Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FrameworkLayout from "../FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createQuestionForGod,
  deleteQuestionForGod,
  fetchQuestionsForGod,
  formatQuestionDate,
  statusLabel,
  type QuestionForGodRow,
  type QuestionForGodStatus,
} from "@/lib/framework/questionsForGod";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const FILTERS: { id: QuestionForGodStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "insight", label: "Partial insight" },
  { id: "released", label: "Released" },
  { id: "unknown", label: "May never know" },
];

export default function QuestionsForGodListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<QuestionForGodRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<QuestionForGodStatus | "all">("all");
  const [quickQuestion, setQuickQuestion] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const data = await fetchQuestionsForGod(supabase, user.id, filter);
    setRows(data);
    setFetching(false);
  }, [user, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const quickAdd = async () => {
    if (!user || !quickQuestion.trim()) return;
    setQuickBusy(true);
    const row = await createQuestionForGod(supabase, user.id, { question: quickQuestion.trim() });
    setQuickBusy(false);
    if (row) {
      setQuickQuestion("");
      navigate(`/framework/questions-for-god/${row.id}`);
    } else {
      toast({ title: "Could not save question", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    const ok = await deleteQuestionForGod(supabase, user.id, id);
    if (ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Deleted" });
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Questions for God" back="/framework">
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        A log of the whys you bring to God. You do not have to solve these — some may stay open forever,
        and that is fine.
      </p>

      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={quickQuestion}
            onChange={(e) => setQuickQuestion(e.target.value)}
            placeholder="God, why…?"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && quickQuestion.trim()) void quickAdd();
            }}
          />
          <Button
            type="button"
            disabled={quickBusy || !quickQuestion.trim()}
            onClick={() => void quickAdd()}
            className="shrink-0"
          >
            {quickBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log it"}
          </Button>
          <Button asChild variant="outline" size="default" className="shrink-0">
            <Link to="/framework/questions-for-god/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Add with context
            </Link>
          </Button>
        </div>

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

      {fetching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          <HandHeart className="mx-auto mb-3 h-8 w-8 opacity-50" aria-hidden />
          <p>No questions logged yet.</p>
          <p className="mt-2">Type a why above when it hits you — no answer required.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <li
              key={q.id}
              className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <Link to={`/framework/questions-for-god/${q.id}`} className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {statusLabel(q.status as QuestionForGodStatus)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatQuestionDate(q.created_at)}
                    </span>
                  </div>
                  <h3 className="font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                    {q.question}
                  </h3>
                  {q.insight ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{q.insight}</p>
                  ) : q.context ? (
                    <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">{q.context}</p>
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
