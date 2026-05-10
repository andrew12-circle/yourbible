import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { BookOpen, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  topic: string;
  summary: string;
  sections: any[];
  schedule: any[];
  related_belief_ids: string[];
  created_at: string;
}

export default function StudyPage() {
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [topic, setTopic] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("study_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPlans(((data as unknown) as Plan[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("framework-study", { body: { topic: topic.trim(), days } });
    setBusy(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Study plan ready" }); setTopic(""); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("study_plans").delete().eq("id", id);
    setPlans((p) => p.filter((x) => x.id !== id));
  };

  return (
    <FrameworkLayout title="Topical study" back="/framework">
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Topic</label>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Suffering, baptism, the kingdom" className="flex-1 min-w-[200px]" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 text-sm">
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <Button onClick={generate} disabled={busy || !topic.trim()}>
            <Sparkles className={`w-4 h-4 mr-1 ${busy ? "animate-pulse" : ""}`} />
            {busy ? "Building…" : "Generate"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The plan uses your existing framework — what you already affirm, what's silent, and which counter-positions need airtime.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <BookOpen className="w-5 h-5 mx-auto mb-2 opacity-60" />
          No study plans yet.
        </div>
      ) : (
        <ul className="space-y-6">
          {plans.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                  <h2 className="font-display text-xl">{p.topic}</h2>
                </div>
                <button onClick={() => remove(p.id)} className="text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm mb-4">{p.summary}</p>
              {(p.sections ?? []).map((s: any, i: number) => (
                <section key={i} className="mb-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{s.heading}</h3>
                  {s.framework_alignment && (
                    <p className="text-xs text-muted-foreground italic mb-1.5">Your framework: {s.framework_alignment}</p>
                  )}
                  {(s.passages ?? []).length > 0 && (
                    <ul className="text-sm space-y-0.5 mb-1.5">
                      {s.passages.map((pp: any, j: number) => (
                        <li key={j}><span className="font-medium">{pp.ref}</span>{pp.why ? <span className="text-muted-foreground"> — {pp.why}</span> : null}</li>
                      ))}
                    </ul>
                  )}
                  {(s.counter_positions ?? []).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="uppercase tracking-wider mr-1">Counter:</span>
                      {s.counter_positions.join(" · ")}
                    </div>
                  )}
                </section>
              ))}
              {(p.schedule ?? []).length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs uppercase tracking-[0.18em] text-muted-foreground cursor-pointer">
                    Daily schedule ({p.schedule.length} days)
                  </summary>
                  <ol className="mt-2 space-y-1 text-sm">
                    {p.schedule.map((d: any, i: number) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-muted-foreground tabular-nums w-12">Day {d.day}</span>
                        <span className="font-medium">{d.reference}</span>
                        {d.focus && <span className="text-muted-foreground">— {d.focus}</span>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {p.related_belief_ids?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.related_belief_ids.map((id) => (
                    <Link key={id} to={`/framework/beliefs/${id}`} className="text-[11px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/70">
                      Related belief
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}