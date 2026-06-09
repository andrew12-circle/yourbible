import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import HardQuestionWorkspace from "@/components/framework/hardQuestions/HardQuestionWorkspace";
import { fetchHardQuestionById, type HardQuestionRow } from "@/lib/framework/hardQuestions";

export default function HardQuestionWorkspacePage() {
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [question, setQuestion] = useState<HardQuestionRow | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      const row = await fetchHardQuestionById(supabase, user.id, id);
      if (!cancelled) {
        setQuestion(row);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  if (fetching) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
        <p>Question not found.</p>
        <Link to="/framework/hard-questions" className="mt-4 inline-flex items-center gap-1 text-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to hard questions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HardQuestionWorkspace userId={user.id} question={question} />
    </div>
  );
}
