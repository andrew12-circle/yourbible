import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { CircleHelp, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FrameworkLayout from "../FrameworkLayout";
import { Button } from "@/components/ui/button";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import {
  deleteQuestionForGod,
  fetchQuestionForGodById,
  formatQuestionDate,
  QUESTION_FOR_GOD_STATUSES,
  statusHint,
  statusLabel,
  updateQuestionForGod,
  type QuestionForGodRow,
  type QuestionForGodStatus,
} from "@/lib/framework/questionsForGod";
import { createHardQuestion } from "@/lib/framework/hardQuestions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function QuestionForGodDetailPage() {
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<QuestionForGodRow | null>(null);
  const [fetching, setFetching] = useState(true);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [insight, setInsight] = useState("");
  const [status, setStatus] = useState<QuestionForGodStatus>("waiting");
  const [saving, setSaving] = useState(false);
  const [promoteBusy, setPromoteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setFetching(true);
    const data = await fetchQuestionForGodById(supabase, user.id, id);
    setRow(data);
    if (data) {
      setQuestion(data.question);
      setContext(data.context ?? "");
      setNotes(data.notes);
      setInsight(data.insight ?? "");
      setStatus(data.status as QuestionForGodStatus);
    }
    setFetching(false);
  }, [user, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const save = async () => {
    if (!user || !id || !question.trim()) return;
    setSaving(true);
    const ok = await updateQuestionForGod(supabase, user.id, id, {
      question: question.trim(),
      context: context.trim() || null,
      notes: notes.trim(),
      insight: insight.trim() || null,
      status,
    });
    setSaving(false);
    if (ok) {
      toast({ title: "Saved" });
      void load();
    } else {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const saveStatus = async (next: QuestionForGodStatus) => {
    if (!user || !id) return;
    setStatus(next);
    const ok = await updateQuestionForGod(supabase, user.id, id, { status: next });
    if (!ok) {
      toast({ title: "Could not update status", variant: "destructive" });
      void load();
    }
  };

  const remove = async () => {
    if (!user || !id) return;
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    const ok = await deleteQuestionForGod(supabase, user.id, id);
    if (ok) {
      toast({ title: "Deleted" });
      navigate("/framework/questions-for-god");
    }
  };

  const promoteToHardQuestion = async () => {
    if (!user || !question.trim()) return;
    setPromoteBusy(true);
    const hq = await createHardQuestion(supabase, user.id, {
      title: question.trim(),
      framing: context.trim() || undefined,
      whyItMatters: notes.trim() || undefined,
      currentThinking: insight.trim() || undefined,
      status: "open",
    });
    setPromoteBusy(false);
    if (hq) {
      toast({ title: "Opened in Hard questions" });
      navigate(`/framework/hard-questions/${hq.id}`);
    } else {
      toast({ title: "Could not create hard question", variant: "destructive" });
    }
  };

  if (fetching) {
    return (
      <FrameworkLayout title="Question for God" back="/framework/questions-for-god">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      </FrameworkLayout>
    );
  }

  if (!row) {
    return (
      <FrameworkLayout title="Not found" back="/framework/questions-for-god">
        <p className="text-sm text-muted-foreground">This question could not be found.</p>
        <Link to="/framework/questions-for-god" className="mt-4 inline-flex text-sm hover:underline">
          Back to your log
        </Link>
      </FrameworkLayout>
    );
  }

  return (
    <FrameworkLayout title="Question for God" back="/framework/questions-for-god">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{statusLabel(status)}</span>
          <span>·</span>
          <span>Asked {formatQuestionDate(row.created_at)}</span>
          {row.updated_at !== row.created_at ? (
            <>
              <span>·</span>
              <span>Updated {formatQuestionDate(row.updated_at)}</span>
            </>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Question
          </label>
          <PolishedTextarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            className="text-sm font-medium"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Context
          </label>
          <PolishedTextarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="What was happening when you asked?"
            className="text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Where you are with it
          </label>
          <p className="mb-2 text-xs text-muted-foreground">{statusHint(status)}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUESTION_FOR_GOD_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void saveStatus(s.id)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  status === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-border/80",
                )}
              >
                <span className="block text-sm font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Partial insight (optional)
          </label>
          <PolishedTextarea
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            rows={3}
            placeholder="Anything you sensed, heard, or understood — even if incomplete"
            className="text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Notes over time
          </label>
          <PolishedTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Revisit this when it comes back up…"
            className="text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving || !question.trim()} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={promoteBusy || !question.trim()}
            onClick={() => void promoteToHardQuestion()}
          >
            {promoteBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CircleHelp className="mr-1.5 h-4 w-4" />
                Research as hard question
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void remove()}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </FrameworkLayout>
  );
}
