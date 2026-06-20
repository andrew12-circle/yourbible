import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FrameworkLayout from "../FrameworkLayout";
import { Button } from "@/components/ui/button";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import {
  createQuestionForGod,
  QUESTION_FOR_GOD_STATUSES,
  type QuestionForGodStatus,
} from "@/lib/framework/questionsForGod";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function QuestionForGodNewPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<QuestionForGodStatus>("waiting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prefill = params.get("question");
    if (prefill) setQuestion(prefill);
  }, [params]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submit = async () => {
    if (!question.trim()) return;
    setBusy(true);
    const row = await createQuestionForGod(supabase, user.id, {
      question: question.trim(),
      context: context.trim() || undefined,
      status,
    });
    setBusy(false);
    if (row) navigate(`/framework/questions-for-god/${row.id}`);
    else toast({ title: "Could not save question", variant: "destructive" });
  };

  return (
    <FrameworkLayout title="New question for God" back="/framework/questions-for-god">
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Your question
          </label>
          <PolishedTextarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="God, why…?"
            className="text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Context (optional)
          </label>
          <PolishedTextarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="What was going on when you asked?"
            className="text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Where you are with it
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUESTION_FOR_GOD_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  status === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-border/80",
                )}
              >
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <Button type="button" disabled={busy || !question.trim()} onClick={() => void submit()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to your log"}
        </Button>
      </div>
    </FrameworkLayout>
  );
}
